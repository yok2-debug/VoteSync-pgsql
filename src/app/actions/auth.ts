'use server';

import { prisma } from '@/lib/prisma';
import { createAdminSession, createVoterSession } from '@/lib/session';
import type { AdminSessionPayload, Permission, Role, AdminUser, Voter } from '@/lib/types';
import { verifyPassword } from '@/lib/password';
import { logger } from '@/lib/logger';

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

        const voter: Voter = {
            id: voterData.id,
            name: voterData.name,
            category: voterData.categoryId || '',
            password: voterData.password,
            nik: voterData.nik || undefined,
            birthPlace: voterData.birthPlace || undefined,
            birthDate: voterData.birthDate || undefined,
            gender: voterData.gender as 'Laki-laki' | 'Perempuan' | undefined,
            address: voterData.address || undefined,
            hasVoted: (voterData.hasVoted as Record<string, boolean>) || {},
        };

        // Verify plain text password
        const isValid = password === voter.password;
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
