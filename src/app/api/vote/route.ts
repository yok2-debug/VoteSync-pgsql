import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVoterSession } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { electionId, candidateId, voterId } = await request.json();

    if (!electionId || !candidateId || !voterId) {
      return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
    }

    // VERIFIKASI SESI (Fix Vote Spoofing)
    const session = await getVoterSession();
    if (!session || session.voterId !== voterId) {
      return NextResponse.json({ message: 'Akses ditolak. Sesi tidak valid.' }, { status: 403 });
    }

    // Create vote hash for anonymity
    const voterIdHash = Buffer.from(voterId).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);

    // Check if already voted using unique constraint
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

    // Insert vote receipt
    try {
      await prisma.vote.create({
        data: {
          electionId,
          candidateId,
          voterIdHash,
          timestamp: BigInt(Date.now()),
        }
      });
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Anda sudah memberikan suara dalam pemilihan ini.' }, { status: 409 });
      }
      logger.error({ err: error }, 'Error inserting vote');
      return NextResponse.json({ message: 'Gagal mencatat suara' }, { status: 500 });
    }

    // Update voter's hasVoted status
    const voterData = await prisma.voter.findUnique({
      where: { id: voterId },
      select: { hasVoted: true }
    });

    if (voterData) {
      const hasVoted = (voterData.hasVoted as Record<string, boolean>) || {};
      hasVoted[electionId] = true;

      await prisma.voter.update({
        where: { id: voterId },
        data: { hasVoted }
      });
    }

    return NextResponse.json({
      message: 'Suara berhasil dicatat'
    }, { status: 200 });

  } catch (error) {
    logger.error({ err: error }, 'Vote error');
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui';
    return NextResponse.json({ message: 'Gagal mencatat suara', error: errorMessage }, { status: 500 });
  }
}
