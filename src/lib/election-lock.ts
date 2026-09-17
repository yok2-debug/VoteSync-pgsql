import type { Prisma } from '@prisma/client';

/**
 * PostgreSQL advisory lock used to serialize operations that must not
 * happen concurrently with voting/reset operations.
 *
 * Shared lock:
 *   - voting
 *   - changing election status
 *
 * Exclusive lock:
 *   - destructive reset operations
 *
 * Transaction-scoped advisory locks are automatically released when
 * the transaction finishes.
 */
const ELECTION_OPERATION_LOCK_KEY = 82463217;
const REAL_COUNT_LOCK_KEY = 82463218;
const COMMITTEE_OPERATION_LOCK_KEY = 82463219;

export class VotingInProgressError extends Error {
  constructor() {
    super('VOTING_IN_PROGRESS');
    this.name = 'VotingInProgressError';
  }
}

export async function acquireRealCountLock(
  tx: Prisma.TransactionClient
): Promise<void> {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(${REAL_COUNT_LOCK_KEY}::bigint)
  `;
}

export async function acquireCommitteeOperationLock(
  tx: Prisma.TransactionClient
): Promise<void> {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(${COMMITTEE_OPERATION_LOCK_KEY}::bigint)
  `;
}

export async function acquireElectionOperationLock(
  tx: Prisma.TransactionClient,
  mode: 'shared' | 'exclusive'
): Promise<void> {
  if (mode === 'shared') {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock_shared(${ELECTION_OPERATION_LOCK_KEY}::bigint)
    `;
    return;
  }

  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(${ELECTION_OPERATION_LOCK_KEY}::bigint)
  `;
}
