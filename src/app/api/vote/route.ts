import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVoterSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { z } from 'zod';
import { InvalidJsonError, parseJsonBody } from '../lib/api-helpers';
import { Prisma } from '@prisma/client';

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

    // Fetch Election and Voter data to validate constraints
    const [election, voterData] = await Promise.all([
      prisma.election.findUnique({ where: { id: electionId } }),
      prisma.voter.findUnique({ where: { id: voterId } })
    ]);

    if (!election) {
      return NextResponse.json({ message: 'Pemilihan tidak ditemukan.' }, { status: 404 });
    }

    if (!voterData) {
      return NextResponse.json({ message: 'Pemilih tidak ditemukan.' }, { status: 404 });
    }

    // Validasi Status dan Waktu Pemilihan
    const now = new Date();
    if (election.status !== 'active') {
      return NextResponse.json({ message: 'Pemilihan belum aktif atau sudah ditutup.' }, { status: 403 });
    }
    if (election.startDate && new Date(election.startDate) > now) {
      return NextResponse.json({ message: 'Waktu pemilihan belum dimulai.' }, { status: 403 });
    }
    if (election.endDate && new Date(election.endDate) < now) {
      return NextResponse.json({ message: 'Waktu pemilihan sudah ditutup.' }, { status: 403 });
    }

    // Validasi bahwa kandidat benar-benar milik election yang dipilih.
    // Jangan percaya candidateId yang dikirim oleh client.
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, electionId: true },
    });

    if (!candidate || candidate.electionId !== electionId) {
      return NextResponse.json(
        { message: 'Kandidat tidak valid untuk pemilihan ini.' },
        { status: 403 }
      );
    }

    // Validasi Kategori Pemilih
    // Sumber kebenaran ada di Category.allowedElections, bukan Election.allowedCategories
    if (!voterData.categoryId) {
      return NextResponse.json({ message: 'Anda tidak memiliki hak suara untuk pemilihan ini.' }, { status: 403 });
    }

    const voterCategory = await prisma.category.findUnique({
      where: { id: voterData.categoryId },
      select: { allowedElections: true }
    });

    if (!voterCategory || !voterCategory.allowedElections.includes(electionId)) {
      return NextResponse.json({ message: 'Anda tidak memiliki hak suara untuk pemilihan ini.' }, { status: 403 });
    }

    // Cek apakah sudah memilih (via field hasVoted di tabel Voter)
    const hasVoted = (voterData.hasVoted as Record<string, boolean>) || {};
    if (hasVoted[electionId]) {
      return NextResponse.json({ message: 'Anda sudah memberikan suara dalam pemilihan ini.' }, { status: 409 });
    }

    // Create secure vote hash for anonymity
    const VOTE_SECRET = process.env.VOTE_SECRET_SALT || 'default-secret-salt-change-me';
    // Gunakan SHA-256 dan sertakan electionId agar unik per pemilihan jika salt sama
    const voterIdHash = crypto
      .createHash('sha256')
      .update(voterId + electionId + VOTE_SECRET)
      .digest('hex');

    // Cek duplikasi di tabel Vote berdasarkan hash
    const existingVote = await prisma.vote.findUnique({
      where: {
        electionId_voterIdHash: {
          electionId,
          voterIdHash
        }
      }
    });

    if (existingVote) {
      return NextResponse.json({ message: 'Anda sudah memberikan suara dalam pemilihan ini.' }, { status: 409 });
    }

    hasVoted[electionId] = true;

    // Lakukan pencatatan suara dan update status pemilih secara Transaksional
    try {
      await prisma.$transaction([
        prisma.vote.create({
          data: {
            electionId,
            candidateId,
            voterIdHash,
            timestamp: BigInt(Date.now()),
          }
        }),
        prisma.voter.update({
          where: { id: voterId },
          data: { hasVoted }
        })
      ]);
    } catch (error: unknown) {
      // Handle unique constraint violation from parallel requests
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return NextResponse.json(
          { message: 'Anda sudah memberikan suara dalam pemilihan ini.' },
          { status: 409 }
        );
      }
      throw error; // Let the outer catch handle and log it
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
