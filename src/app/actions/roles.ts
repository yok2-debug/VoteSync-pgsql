'use server';

import { prisma } from '@/lib/prisma';
import type { Role } from '@/lib/types';
import { verifyAdminSession, canManagePermissions } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';

export async function getRoles(): Promise<{ success: boolean; data?: Role[]; message?: string }> {
    try {
        const session = await verifyAdminSession('users');

        const rolesData = await prisma.role.findMany({
            orderBy: { name: 'asc' },
        });

        if (!rolesData || rolesData.length === 0) {
            return { success: true, data: [] };
        }

        const roles = rolesData
            .filter((r: { id: string; name: string; permissions: string[] }) =>
                canManagePermissions(session.permissions, r.permissions || [])
            )
            .map((r: { id: string; name: string; permissions: string[] }) => ({
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
