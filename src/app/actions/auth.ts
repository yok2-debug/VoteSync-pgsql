'use server';

import { prisma } from '@/lib/prisma';
import { createAdminSession, createVoterSession } from '@/lib/session';
import type { AdminSessionPayload, Permission, Role, AdminUser } from '@/lib/types';
import { hashPassword, verifyPassword } from '@/lib/password';
import { logger } from '@/lib/logger';

function isBcryptHash(value: string): boolean {
    return /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function loginAdmin(prevState: any, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return { success: false, message: 'Username dan password wajib diisi.' };
    }

    try {
        // 1. Fetch User by username
        const userData = await prisma.appUser.findUnique({
            where: { username }
        });

        if (!userData) {
            return { success: false, message: 'Kredensial tidak valid.' };
        }

        const user: AdminUser = {
            id: userData.id,
            username: userData.username,
            password: userData.password,
            roleId: userData.roleId || '',
        };

        const isValid = await verifyPassword(password, user.password || '');
        if (!isValid) {
            return { success: false, message: 'Kredensial tidak valid.' };
        }

        // 2. Fetch Role
        const roleData = await prisma.role.findUnique({
            where: { id: user.roleId }
        });

        if (!roleData) {
            return { success: false, message: 'Peran pengguna tidak ditemukan.' };
        }

        const role: Role = {
            id: roleData.id,
            name: roleData.name,
            permissions: roleData.permissions as Permission[] || [],
        };

        if (!role.permissions || role.permissions.length === 0) {
            return { success: false, message: 'Akun tidak memiliki izin akses.' };
        }

        // 3. Create Session
        const sessionPayload: Omit<AdminSessionPayload, 'expires'> = {
            userId: user.id,
            username: user.username,
            roleId: user.roleId,
            roleName: role.name,
            permissions: role.permissions as Permission[],
            sessionVersion: userData.sessionVersion,
        };

        await createAdminSession(sessionPayload);

        return {
            success: true,
            message: 'Login berhasil',
            payload: sessionPayload,
            permissions: role.permissions
        };

    } catch (error) {
        logger.error({ err: error }, 'Admin login error');
        return { success: false, message: 'Terjadi kesalahan server.' };
    }
}

export async function loginVoter(prevState: any, formData: FormData) {
    const voterId = formData.get('voterId') as string;
    const password = formData.get('password') as string;

    if (!voterId || !password) {
        return { success: false, message: 'ID Pemilih dan password wajib diisi.' };
    }

    try {
        const voterData = await prisma.voter.findUnique({
            where: { id: voterId }
        });

        if (!voterData) {
            return { success: false, message: 'ID Pemilih atau password tidak valid.' };
        }

	const storedPassword = voterData.password || '';

        let isValid = false;

        if (isBcryptHash(storedPassword)) {
            // Password baru: verifikasi menggunakan bcrypt.
            isValid = await verifyPassword(password, storedPassword);
        } else {
            // Kompatibilitas dengan data lama yang masih plaintext.
            isValid = password === storedPassword;

            if (isValid) {
                // Migrasi otomatis plaintext -> bcrypt setelah login berhasil.
                const hashedPassword = await hashPassword(password);

                await prisma.voter.update({
                    where: { id: voterData.id },
                    data: { password: hashedPassword },
                });

                logger.info(
                    { voterId: voterData.id },
                    'Migrated legacy voter password to bcrypt'
                );
            }
        }

        if (!isValid) {
            return { success: false, message: 'ID Pemilih atau password tidak valid.' };
        }

        await createVoterSession({ voterId });

        return { success: true, message: 'Login berhasil', voterId: voterId };

    } catch (error) {
        logger.error({ err: error }, 'Voter login error');
        return { success: false, message: 'Terjadi kesalahan server.' };
    }
}
