import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVoterSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

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
    } catch (error: any) {
      // Handle unique constraint violation from parallel requests
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Anda sudah memberikan suara dalam pemilihan ini.' }, { status: 409 });
      }
      throw error; // Let the outer catch handle and log it
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
