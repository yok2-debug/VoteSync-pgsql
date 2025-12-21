'use server';

import { prisma } from '@/lib/prisma';
import type { AdminUser } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';

export async function getAdminUsers(): Promise<{ success: boolean; data?: AdminUser[]; message?: string }> {
    try {
        await verifyAdminSession('users');

        const users = await prisma.appUser.findMany();

        if (!users || users.length === 0) {
            return { success: true, data: [] };
        }

        // Map to AdminUser type and remove passwords
        const sanitizedUsers = users.map((u) => ({
            id: u.id,
            username: u.username,
            roleId: u.roleId || '',
        })) as AdminUser[];

        return { success: true, data: sanitizedUsers };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed fetching admin users');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error fetching admin users');
        return { success: false, message: 'Gagal mengambil data pengguna.' };
    }
}
