import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError, verifyAdminSession } from '../../lib/api-helpers';

const resetActionSchema = z.object({
  action: z.enum([
    'reset_votes_and_status',
    'delete_all_voters',
    'reset_all_elections',
  ]),
});

export async function POST(request: Request) {
  try {
    await verifyAdminSession('settings');
    const result = resetActionSchema.safeParse(await request.json());

    if (!result.success) {
      return NextResponse.json(
        { message: 'Data tidak valid.', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = result.data;

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
