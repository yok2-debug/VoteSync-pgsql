import { jwtVerify, SignJWT } from 'jose';
import type { AdminSessionPayload, VoterSessionPayload } from './types';
import { logger } from './logger';

function getSecret(): Uint8Array {
    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
    if (!JWT_SECRET_KEY) {
        throw new Error('JWT_SECRET_KEY is not defined');
    }
    return new TextEncoder().encode(JWT_SECRET_KEY);
}

export async function encrypt(
    payload: Omit<AdminSessionPayload, 'expires'> | Omit<VoterSessionPayload, 'expires'>
) {
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    return await new SignJWT({ ...payload, expires: expires.toISOString() })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expires)
        .sign(getSecret());
}

export async function decrypt(input: string): Promise<AdminSessionPayload | null> {
    try {
        const { payload } = await jwtVerify(input, getSecret());
        return payload as unknown as AdminSessionPayload;
    } catch (error) {
        logger.error({ err: error }, 'JWT verification failed');
        return null;
    }
}
