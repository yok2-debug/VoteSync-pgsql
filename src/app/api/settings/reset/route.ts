import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, verifyAdminSession } from '../../lib/api-helpers';

export async function POST(request: Request) {
  try {
    await verifyAdminSession('settings');
    const { action } = await request.json();

    switch (action) {
      case 'reset_votes_and_status':
        await resetVotesAndStatus();
        break;
      case 'delete_all_voters':
        await prisma.voter.deleteMany();
        break;
      case 'reset_all_elections':
        // Delete all votes first
        await prisma.vote.deleteMany();
        // Delete all candidates
        await prisma.candidate.deleteMany();
        // Delete all elections
        await prisma.election.deleteMany();
        // Reset hasVoted for remaining voters
        await resetVotesAndStatus();
        break;
      default:
        return NextResponse.json({ message: 'Aksi tidak valid' }, { status: 400 });
    }

    return NextResponse.json({ message: `Aksi '${action}' berhasil diselesaikan` }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

async function resetVotesAndStatus() {
  // 1. Reset hasVoted status for all voters
  await prisma.voter.updateMany({
    data: { hasVoted: {} }
  });

  // 2. Delete all votes (voteReceipts equivalent)
  await prisma.vote.deleteMany();
}
