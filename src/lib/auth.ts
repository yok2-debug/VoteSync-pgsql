import { jwtVerify, SignJWT } from 'jose';
import type { AdminSessionPayload } from './types';
import { logger } from './logger';

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET_KEY) {
    throw new Error('JWT_SECRET_KEY is not defined');
}

const secret = new TextEncoder().encode(JWT_SECRET_KEY);

export async function encrypt(payload: Omit<AdminSessionPayload, 'expires'>) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return await new SignJWT({ ...payload, expires: expires.toISOString() })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expires)
        .sign(secret);
}

export async function decrypt(input: string): Promise<AdminSessionPayload | null> {
    try {
        const { payload } = await jwtVerify(input, secret);
        return payload as unknown as AdminSessionPayload;
    } catch (error) {
        logger.error({ err: error }, 'JWT verification failed');
        return null;
    }
}
