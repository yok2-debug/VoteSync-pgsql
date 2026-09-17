import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVoterSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { z } from 'zod';
import { InvalidJsonError, parseJsonBody } from '../lib/api-helpers';
import { Prisma } from '@prisma/client';
import { acquireElectionOperationLock } from '@/lib/election-lock';

const voteSchema = z.object({
  electionId: z.string().min(1),
  candidateId: z.string().min(1),
  voterId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await parseJsonBody(request);
    const result = voteSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Data tidak valid.', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { electionId, candidateId, voterId } = result.data;

    // VERIFIKASI SESI (Fix Vote Spoofing)
    const session = await getVoterSession();
    if (!session || session.voterId !== voterId) {
      return NextResponse.json({ message: 'Akses ditolak. Sesi tidak valid.' }, { status: 403 });
    }

    // Create secure vote hash for anonymity
    const VOTE_SECRET = process.env.VOTE_SECRET_SALT;

    if (!VOTE_SECRET) {
      throw new Error('VOTE_SECRET_SALT is not configured');
    }

    // Gunakan SHA-256 dan sertakan electionId agar unik per pemilihan jika salt sama
    const voterIdHash = crypto
      .createHash('sha256')
      .update(voterId + electionId + VOTE_SECRET)
      .digest('hex');

    // Lakukan pemeriksaan dan pencatatan suara secara atomik.
    // Serializable mencegah lost update pada hasVoted ketika voter
    // mengirim beberapa request secara bersamaan.
    const maxRetries = 3;

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await prisma.$transaction(
            async (tx) => {
              await acquireElectionOperationLock(tx, 'shared');

              // Semua data yang menentukan apakah suara boleh diterima
              // harus dibaca setelah lock diperoleh agar tidak memakai
              // state yang stale akibat perubahan admin secara bersamaan.
              const election = await tx.election.findUnique({
                where: { id: electionId },
              });

              if (!election) {
                throw new Error('ELECTION_NOT_FOUND');
              }

              const currentVoter = await tx.voter.findUnique({
                where: { id: voterId },
                select: { hasVoted: true, categoryId: true },
              });

              if (!currentVoter) {
                throw new Error('VOTER_NOT_FOUND');
              }

              const now = new Date();

              if (election.status !== 'active') {
                throw new Error('ELECTION_NOT_ACTIVE');
              }

              if (election.startDate && new Date(election.startDate) > now) {
                throw new Error('ELECTION_NOT_STARTED');
              }

              if (election.endDate && new Date(election.endDate) < now) {
                throw new Error('ELECTION_ENDED');
              }

              // Jangan percaya candidateId yang dikirim oleh client.
              const candidate = await tx.candidate.findUnique({
                where: { id: candidateId },
                select: { id: true, electionId: true },
              });

              if (!candidate || candidate.electionId !== electionId) {
                throw new Error('INVALID_CANDIDATE');
              }

              // Sumber kebenaran hak suara ada di Category.allowedElections.
              if (!currentVoter.categoryId) {
                throw new Error('VOTER_NOT_ELIGIBLE');
              }

              const voterCategory = await tx.category.findUnique({
                where: { id: currentVoter.categoryId },
                select: { allowedElections: true },
              });

              if (
                !voterCategory ||
                !voterCategory.allowedElections.includes(electionId)
              ) {
                throw new Error('VOTER_NOT_ELIGIBLE');
              }

              const hasVoted =
                (currentVoter.hasVoted as Record<string, boolean>) || {};

              if (hasVoted[electionId]) {
                throw new Error('VOTER_ALREADY_VOTED');
              }

              // Unique constraint (electionId, voterIdHash) tetap menjadi
              // pengaman database terhadap double vote.
              const existingVote = await tx.vote.findUnique({
                where: {
                  electionId_voterIdHash: {
                    electionId,
                    voterIdHash,
                  },
                },
              });

              if (existingVote) {
                throw new Error('VOTER_ALREADY_VOTED');
              }

              const updatedHasVoted = {
                ...hasVoted,
                [electionId]: true,
              };

              await tx.vote.create({
                data: {
                  electionId,
                  candidateId,
                  voterIdHash,
                  timestamp: BigInt(Date.now()),
                },
              });

              await tx.voter.update({
                where: { id: voterId },
                data: { hasVoted: updatedHasVoted },
              });
            },
            {
              isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            }
          );

          break;
        } catch (error: unknown) {
          if (error instanceof Error && error.message === 'ELECTION_NOT_FOUND') {
            return NextResponse.json(
              { message: 'Pemilihan tidak ditemukan.' },
              { status: 404 }
            );
          }

          if (error instanceof Error && error.message === 'VOTER_NOT_FOUND') {
            return NextResponse.json(
              { message: 'Pemilih tidak ditemukan.' },
              { status: 404 }
            );
          }

          if (
            error instanceof Error &&
            error.message === 'ELECTION_NOT_ACTIVE'
          ) {
            return NextResponse.json(
              { message: 'Pemilihan belum aktif atau sudah ditutup.' },
              { status: 403 }
            );
          }

          if (
            error instanceof Error &&
            error.message === 'ELECTION_NOT_STARTED'
          ) {
            return NextResponse.json(
              { message: 'Waktu pemilihan belum dimulai.' },
              { status: 403 }
            );
          }

          if (
            error instanceof Error &&
            error.message === 'ELECTION_ENDED'
          ) {
            return NextResponse.json(
              { message: 'Waktu pemilihan sudah ditutup.' },
              { status: 403 }
            );
          }

          if (
            error instanceof Error &&
            error.message === 'INVALID_CANDIDATE'
          ) {
            return NextResponse.json(
              { message: 'Kandidat tidak valid untuk pemilihan ini.' },
              { status: 403 }
            );
          }

          if (
            error instanceof Error &&
            error.message === 'VOTER_NOT_ELIGIBLE'
          ) {
            return NextResponse.json(
              { message: 'Anda tidak memiliki hak suara untuk pemilihan ini.' },
              { status: 403 }
            );
          }

          if (error instanceof Error && error.message === 'VOTER_ALREADY_VOTED') {
            return NextResponse.json(
              { message: 'Anda sudah memberikan suara dalam pemilihan ini.' },
              { status: 409 }
            );
          }

          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            return NextResponse.json(
              { message: 'Anda sudah memberikan suara dalam pemilihan ini.' },
              { status: 409 }
            );
          }

          // P2034 = transaction serialization conflict/deadlock.
          // Retry agar concurrent vote requests tidak gagal secara
          // permanen hanya karena benturan transaksi.
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034' &&
            attempt < maxRetries
          ) {
            continue;
          }

          throw error;
        }
      }
    } catch (error: unknown) {
      throw error;
    }

    return NextResponse.json({
      message: 'Suara berhasil dicatat'
    }, { status: 200 });

  } catch (error) {
    if (error instanceof InvalidJsonError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    logger.error({ err: error }, 'Vote error');
    return NextResponse.json(
      { message: 'Gagal mencatat suara' },
      { status: 500 }
    );
  }
}
