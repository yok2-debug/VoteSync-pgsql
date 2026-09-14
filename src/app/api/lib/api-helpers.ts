import { NextResponse } from 'next/server';
import type { AdminSessionPayload, Permission } from '@/lib/types';
import { getAdminSession } from '@/lib/session';
import { logger } from '@/lib/logger';


export class InvalidJsonError extends Error {
  constructor(message = 'Format JSON tidak valid.') {
    super(message);
    this.name = 'InvalidJsonError';
  }
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new InvalidJsonError();
  }
}

export class AuthError extends Error {
  constructor(message = 'Akses ditolak. Anda tidak memiliki izin.') {
    super(message);
    this.name = 'AuthError';
  }
}

export async function verifyAdminSession(requiredPermission?: Permission): Promise<AdminSessionPayload> {
  const session = await getAdminSession();

  if (!session) {
    throw new AuthError('Sesi tidak valid atau telah kedaluwarsa.');
  }

  if (requiredPermission && (!session.permissions || !session.permissions.includes(requiredPermission))) {
    throw new AuthError(`Akses ditolak. Izin '${requiredPermission}' diperlukan.`);
  }

  return session;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof InvalidJsonError) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    );
  }

  if (error instanceof AuthError) {
    logger.warn({ msg: error.message }, 'AuthError in API Route');
    return NextResponse.json({ message: error.message }, { status: 403 }); // 403 Forbidden
  }

  logger.error({ err: error }, 'Unhandled API Error');

  return NextResponse.json(
    { message: 'Terjadi kesalahan pada server' },
    { status: 500 }
  );
}
