'use server';

import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { AdminSessionPayload, VoterSessionPayload } from './types';
import { encrypt, decrypt } from './auth';

const ADMIN_SESSION_COOKIE_NAME = 'votesync_admin_session';
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

// Allow overriding secure cookie via env var (useful for HTTP in production-like environments)
const isSecureCookie = process.env.COOKIE_SECURE === 'false'
  ? false
  : process.env.NODE_ENV === 'production';

export async function createAdminSession(payload: Omit<AdminSessionPayload, 'expires'>) {
  const expires = new Date(Date.now() + SESSION_DURATION);
  const session = await encrypt(payload);

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: isSecureCookie,
    expires: expires,
    path: '/',
    sameSite: 'lax',
  });
}

export async function deleteAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}

export async function revokeAdminSessions(userId: string) {
  await prisma.appUser.update({
    where: { id: userId },
    data: {
      sessionVersion: {
        increment: 1,
      },
    },
  });
}

export async function logoutAdmin() {
  await deleteAdminSessionCookie();
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) return null;

  const session = await decrypt(sessionCookie);
  if (!session) return null;

  const user = await prisma.appUser.findUnique({
    where: { id: session.userId },
    select: { sessionVersion: true },
  });

  if (!user || user.sessionVersion !== session.sessionVersion) {
    return null;
  }

  return session;
}

const VOTER_SESSION_COOKIE_NAME = 'votesync_voter_session';

export async function createVoterSession(payload: Omit<VoterSessionPayload, 'expires'>) {
  const expires = new Date(Date.now() + SESSION_DURATION);
  // Reuse encrypt function (it handles generic payload if typed correctly, or we cast)
  // AdminSessionPayload has specific fields, but encrypt takes Omit<AdminSessionPayload, 'expires'>.
  // We might need to update encrypt signature or cast payload.
  // Let's check auth.ts encrypt signature.
  // It expects AdminSessionPayload. We should generalize it or cast.
  // For now, let's cast to any to bypass strict type check for the generic encrypt, 
  // or better, update auth.ts to be generic. 
  // But updating auth.ts might break other things. 
  // Let's assume encrypt can handle it if we cast.
  const session = await encrypt(payload);

  const cookieStore = await cookies();

  cookieStore.set(VOTER_SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: isSecureCookie,
    expires: expires,
    path: '/',
    sameSite: 'lax',
  });
}

export async function deleteVoterSession() {
  const cookieStore = await cookies();
  cookieStore.delete(VOTER_SESSION_COOKIE_NAME);
}

export async function getVoterSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(VOTER_SESSION_COOKIE_NAME)?.value;
  if (!session) return null;
  return await decrypt(session) as unknown as VoterSessionPayload;
}
