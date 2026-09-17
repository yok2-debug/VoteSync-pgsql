import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError, parseJsonBody, verifyAdminSession } from '../../lib/api-helpers';
import {
  acquireElectionOperationLock,
  VotingInProgressError,
} from '@/lib/election-lock';

const resetActionSchema = z.object({
  action: z.enum([
    'reset_votes_and_status',
    'delete_all_voters',
    'reset_all_elections',
  ]),
});

export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession();

    if (session.roleId !== 'role_super_admin') {
      return NextResponse.json(
        { message: 'Akses ditolak.' },
        { status: 403 }
      );
    }

    const result = resetActionSchema.safeParse(await parseJsonBody(request));

    if (!result.success) {
      return NextResponse.json(
        { message: 'Data tidak valid.', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = result.data;

    await prisma.$transaction(async (tx) => {
      await acquireElectionOperationLock(tx, 'exclusive');

      const activeElection = await tx.election.findFirst({
        where: { status: 'active' },
        select: { id: true, name: true },
      });

      if (activeElection) {
        throw new VotingInProgressError();
      }

      switch (action) {
        case 'reset_votes_and_status':
          await tx.voter.updateMany({
            data: { hasVoted: {} },
          });
          await tx.vote.deleteMany();
          break;

        case 'delete_all_voters':
          await tx.voter.deleteMany();
          break;

        case 'reset_all_elections':
          await tx.vote.deleteMany();
          await tx.candidate.deleteMany();
          await tx.election.deleteMany();
          await tx.voter.updateMany({
            data: { hasVoted: {} },
          });
          break;

        default:
          throw new Error('INVALID_RESET_ACTION');
      }
    });

    return NextResponse.json({ message: `Aksi '${action}' berhasil diselesaikan` }, { status: 200 });
  } catch (error) {
    if (error instanceof VotingInProgressError) {
      return NextResponse.json(
        { message: 'Reset tidak dapat dilakukan selama voting berlangsung.' },
        { status: 409 }
      );
    }

    return handleApiError(error);
  }
}
