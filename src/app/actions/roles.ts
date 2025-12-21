'use server';

import { prisma } from '@/lib/prisma';
import type { Role } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';

export async function getRoles(): Promise<{ success: boolean; data?: Role[]; message?: string }> {
    try {
        await verifyAdminSession(); // Basic check

        const rolesData = await prisma.role.findMany();

        if (!rolesData || rolesData.length === 0) {
            return { success: true, data: [] };
        }

        const roles = rolesData.map((r) => ({
            id: r.id,
            name: r.name,
            permissions: r.permissions || [],
        })) as Role[];

        return { success: true, data: roles };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed fetching roles');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error fetching roles');
        return { success: false, message: 'Gagal mengambil data peran.' };
    }
}
