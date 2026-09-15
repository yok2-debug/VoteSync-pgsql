'use server';

import { prisma } from '@/lib/prisma';
import type { Voter } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { getVoterSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import { hashPassword, generateReadablePassword } from '@/lib/password';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const voterIdSchema = z.string().trim().min(1);

const voterCreateSchema = z.object({
    id: z.string().trim().min(1).optional(),
    name: z.string().trim().optional(),
    category: z.string().trim().optional(),
    password: z.string().min(6).optional(),
    nik: z.string().optional(),
    birthPlace: z.string().optional(),
    birthDate: z.string().optional(),
    gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
    address: z.string().optional(),
});

const voterUpdateSchema = voterCreateSchema.partial();

const voterIdsSchema = z.array(voterIdSchema).min(1);
const bulkPasswordResetSchema = z.array(voterIdSchema).optional();

const bulkCategoryUpdateSchema = z.object({
    voterIds: voterIdsSchema,
    newCategoryId: z.string().trim().min(1),
});

const voterPasswordResetSchema = z.object({
    voterId: voterIdSchema,
    newPassword: z.string().min(6),
});

const importVoterSchema = z.object({
    id: z.string().trim().min(1),
    name: z.string().optional(),
    category: z.string().optional(),
    password: z.string().optional(),
    nik: z.string().optional(),
    birthPlace: z.string().optional(),
    birthDate: z.string().optional(),
    gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
    address: z.string().optional(),
});

const importVotersSchema = z.array(importVoterSchema).min(1);

export async function getVoters(): Promise<{ success: boolean; data?: Voter[]; message?: string }> {
    try {
        await verifyAdminSession('voters');

        const voters = await prisma.voter.findMany();

        if (!voters || voters.length === 0) {
            return { success: true, data: [] };
        }

        // Map to Voter type
        const sanitizedVoters = voters.map((v: any) => ({
            id: v.id,
            name: v.name,
            category: v.categoryId || '',
            nik: v.nik || undefined,
            birthPlace: v.birthPlace || undefined,
            birthDate: v.birthDate || undefined,
            gender: v.gender as 'Laki-laki' | 'Perempuan' | undefined,
            address: v.address || undefined,
            hasVoted: (v.hasVoted as Record<string, boolean>) || {},
        })) as Voter[];

        return { success: true, data: sanitizedVoters };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed fetching voters');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error fetching voters');
        return { success: false, message: 'Gagal mengambil data pemilih.' };
    }
}

export async function getVoter(voterId: string): Promise<{ success: boolean; data?: Voter; message?: string }> {
    try {
        let authorized = false;

        try {
            await verifyAdminSession('voters');
            authorized = true;
        } catch (error) {
            // Not admin
        }

        if (!authorized) {
            const voterSession = await getVoterSession();
            if (voterSession && voterSession.voterId === voterId) {
                authorized = true;
            }
        }

        if (!authorized) {
            const err = new Error('Akses ditolak. Anda tidak memiliki izin.');
            err.name = 'AuthError';
            throw err;
        }

        const voterIdResult = voterIdSchema.safeParse(voterId);
        if (!voterIdResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validVoterId = voterIdResult.data;

        const voter = await prisma.voter.findUnique({
            where: { id: validVoterId }
        });

        if (!voter) {
            return { success: false, message: 'Pemilih tidak ditemukan.' };
        }

	const sanitizedVoter: Voter = {
	    id: voter.id,
	    name: voter.name,
	    category: voter.categoryId || '',
	    nik: voter.nik || undefined,
	    birthPlace: voter.birthPlace || undefined,
	    birthDate: voter.birthDate || undefined,
	    gender: voter.gender as 'Laki-laki' | 'Perempuan' | undefined,
	    address: voter.address || undefined,
	    hasVoted: (voter.hasVoted as Record<string, boolean>) || {},
	};

	return { success: true, data: sanitizedVoter };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message, voterId }, 'Authentication failed fetching voter');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error fetching voter');
        return { success: false, message: 'Gagal mengambil data pemilih.' };
    }
}

export async function getVoterCountsByCategory(): Promise<{ success: boolean; data?: Record<string, number>; message?: string }> {
    try {
        await verifyAdminSession('voters');

        const voters = await prisma.voter.findMany({
            select: { categoryId: true }
        });

        if (!voters) {
            return { success: true, data: {} };
        }

        const counts: Record<string, number> = {};
        voters.forEach((v: any) => {
            if (v.categoryId) {
                counts[v.categoryId] = (counts[v.categoryId] || 0) + 1;
            }
        });

        return { success: true, data: counts };
    } catch (error) {
        logger.error({ err: error }, 'Error counting voters');
        return { success: false, message: 'Gagal menghitung pemilih.' };
    }
}

// Public aggregate-only voter counts for the real-count display.
// This exposes no individual voter data.
export async function getPublicVoterCountsByCategory(): Promise<{ success: boolean; data?: Record<string, number>; message?: string }> {
    try {
        const voters = await prisma.voter.findMany({
            select: { categoryId: true }
        });

        const counts: Record<string, number> = {};

        voters.forEach((v: { categoryId: string | null }) => {
            if (v.categoryId) {
                counts[v.categoryId] = (counts[v.categoryId] || 0) + 1;
            }
        });

        return { success: true, data: counts };
    } catch (error) {
        logger.error({ err: error }, 'Error counting public voter statistics');
        return { success: false, message: 'Gagal menghitung statistik pemilih.' };
    }
}

// --- Mutations ---

export async function createVoter(
    data: Partial<Voter>
): Promise<{
    success: boolean;
    message?: string;
    data?: { voterId: string; password: string };
}> {
    try {
        await verifyAdminSession('voters');

        const dataResult = voterCreateSchema.safeParse(data);
        if (!dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validData = dataResult.data;

        // Generate custom voter ID if not provided
        let voterId = validData.id;

        if (!voterId) {
            const generateTwoLetters = () => {
                const chars = 'ABCDEFGHJKMNPQRTUVWXY';
                let letters = '';
                for (let i = 0; i < 2; i++) {
                    letters += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return letters;
            };

            let attempts = 0;
            while (attempts < 10) {
                const letters = generateTwoLetters();
                const number = Math.floor(100000 + Math.random() * 900000);
                const candidateId = `${letters}-${number}`;

                const existing = await prisma.voter.findUnique({
                    where: { id: candidateId }
                });

                if (!existing) {
                    voterId = candidateId;
                    break;
                }
                attempts++;
            }

            if (!voterId) {
                return { success: false, message: 'Gagal menghasilkan ID pemilih unik.' };
            }
        }

        // Check if ID exists (in case it was provided)
        const existingVoter = await prisma.voter.findUnique({
            where: { id: voterId }
        });

        if (existingVoter) {
            return { success: false, message: `ID Pemilih '${voterId}' sudah ada.` };
        }

	const plainPassword = validData.password || generateReadablePassword();
	const hashedPassword = await hashPassword(plainPassword);

        await prisma.voter.create({
            data: {
                id: voterId,
                name: validData.name || '',
                categoryId: validData.category || null,
                password: hashedPassword,
                nik: validData.nik || '',
                birthPlace: validData.birthPlace || '',
                birthDate: validData.birthDate || '',
                gender: validData.gender || null,
                address: validData.address || '',
                hasVoted: {},
            }
        });

        logger.info({ voterId }, 'Voter created');
        revalidatePath('/admin/voters');
        return {
            success: true,
            message: 'Pemilih berhasil dibuat',
            data: {
                voterId: validVoterId,
                password: plainPassword,
            },
        };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed creating voter');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error creating voter');
        return { success: false, message: 'Gagal membuat pemilih.' };
    }
}

export async function updateVoter(
    voterId: string,
    data: Partial<Voter>
): Promise<{ success: boolean; message?: string; data?: { voterId: string; password?: string } }> {
    try {
        await verifyAdminSession('voters');

        const voterIdResult = voterIdSchema.safeParse(voterId);
        const dataResult = voterUpdateSchema.safeParse(data);
        if (!voterIdResult.success || !dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validVoterId = voterIdResult.data;
        const validData = dataResult.data;

        if (Object.keys(validData).length === 0) {
            return { success: false, message: 'Data tidak valid.' };
        }

        const existingVoter = await prisma.voter.findUnique({
            where: { id: validVoterId }
        });

        if (!existingVoter) {
            return { success: false, message: 'Pemilih tidak ditemukan' };
        }

        const { password, ...restData } = validData;
        const updateData: any = {
            name: restData.name,
            categoryId: restData.category,
            nik: restData.nik,
            birthPlace: restData.birthPlace,
            birthDate: restData.birthDate,
            gender: restData.gender,
            address: restData.address,
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        if (password) {
	    updateData.password = await hashPassword(password);
	    updateData.sessionVersion = {
	        increment: 1,
	    };
        }

        await prisma.voter.update({
            where: { id: validVoterId },
            data: updateData
        });

        logger.info({ voterId: validVoterId }, 'Voter updated');
        revalidatePath('/admin/voters');
        return {
            success: true,
            message: 'Pemilih berhasil diperbarui',
            data: {
                voterId: validVoterId,
                ...(password ? { password } : {}),
            },
        };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed updating voter');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error updating voter');
        return { success: false, message: 'Gagal memperbarui pemilih.' };
    }
}

export async function deleteVoters(voterIds: string[]): Promise<{ success: boolean; message?: string }> {
    try {
        const session = await verifyAdminSession('voters');

        const voterIdsResult = voterIdsSchema.safeParse(voterIds);
        if (!voterIdsResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validVoterIds = voterIdsResult.data;

        if (validVoterIds.length === 0) {
            return { success: false, message: 'Tidak ada ID pemilih yang dipilih' };
        }

        await prisma.voter.deleteMany({
            where: { id: { in: validVoterIds } }
        });

        logger.info({ admin: session.username, count: validVoterIds.length }, 'Voters deleted');
        revalidatePath('/admin/voters');
        return { success: true, message: `${validVoterIds.length} pemilih berhasil dihapus` };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed deleting voters');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error deleting voters');
        return { success: false, message: 'Gagal menghapus pemilih.' };
    }
}

// --- Additional Mutations ---

const normalizeCategory = (name: string) => name ? name.replace(/\s+/g, '').toLowerCase() : '';

export async function bulkUpdateVoterCategory(
    voterIds: string[],
    newCategoryId: string
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('voters');

        const categoryUpdateResult = bulkCategoryUpdateSchema.safeParse({
            voterIds,
            newCategoryId,
        });
        if (!categoryUpdateResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validVoterIds = categoryUpdateResult.data.voterIds;
        const validCategoryId = categoryUpdateResult.data.newCategoryId;

        await prisma.voter.updateMany({
            where: { id: { in: validVoterIds } },
            data: { categoryId: validCategoryId }
        });

        revalidatePath('/admin/voters');
        return { success: true, message: `${validVoterIds.length} pemilih berhasil diperbarui.` };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed bulk updating voters');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error bulk updating voters');
        return { success: false, message: 'Gagal memperbarui pemilih.' };
    }
}

export async function resetVoterPassword(
    voterId: string,
    newPassword: string
): Promise<{
    success: boolean;
    message?: string;
    data?: { voterId: string; password: string };
}> {
    try {
        await verifyAdminSession('voters');

        const passwordResetResult = voterPasswordResetSchema.safeParse({
            voterId,
            newPassword,
        });
        if (!passwordResetResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validVoterId = passwordResetResult.data.voterId;
        const validNewPassword = passwordResetResult.data.newPassword;

        const voter = await prisma.voter.findUnique({
            where: { id: validVoterId }
        });

        if (!voter) {
            return { success: false, message: 'Pemilih tidak ditemukan.' };
        }

        await prisma.voter.update({
            where: { id: validVoterId },
            data: {
                password: await hashPassword(validNewPassword),
                sessionVersion: {
                    increment: 1,
                },
            }
        });

        logger.info({ voterId: validVoterId }, 'Voter password reset');
        return {
            success: true,
            message: 'Kata sandi berhasil direset.',
            data: {
                voterId: validVoterId,
                password: validNewPassword,
            },
        };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed resetting password');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error resetting password');
        return { success: false, message: 'Gagal mereset kata sandi.' };
    }
}

export async function resetVotersPasswords(
    voterIds?: string[]
): Promise<{
    success: boolean;
    message?: string;
    data?: { voterId: string; password: string }[];
}> {
    try {
        await verifyAdminSession('voters');

        const voterIdsResult = bulkPasswordResetSchema.safeParse(voterIds);
        if (!voterIdsResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validVoterIds = voterIdsResult.data;

        const voters = await prisma.voter.findMany({
            where: validVoterIds && validVoterIds.length > 0
                ? { id: { in: validVoterIds } }
                : undefined,
            select: { id: true },
        });

        if (voters.length === 0) {
            return {
                success: false,
                message: 'Tidak ada pemilih yang dapat direset.',
            };
        }

        const temporaryPasswords: { voterId: string; password: string }[] = [];

        for (const voter of voters) {
            const plainPassword = generateReadablePassword();
            const hashedPassword = await hashPassword(plainPassword);

            await prisma.voter.update({
                where: { id: voter.id },
                data: {
                    password: hashedPassword,
                    sessionVersion: {
                        increment: 1,
                    },
                },
            });

            temporaryPasswords.push({
                voterId: voter.id,
                password: plainPassword,
            });
        }

        logger.info(
            { count: temporaryPasswords.length },
            'Voter passwords reset in bulk'
        );

        revalidatePath('/admin/voters');

        return {
            success: true,
            message: `${temporaryPasswords.length} password pemilih berhasil direset.`,
            data: temporaryPasswords,
        };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn(
                { msg: error.message },
                'Authentication failed bulk resetting voter passwords'
            );
            return { success: false, message: error.message };
        }

        logger.error({ err: error }, 'Error bulk resetting voter passwords');

        return {
            success: false,
            message: 'Gagal mereset password pemilih.',
        };
    }
}

export async function importVoters(
    voters: any[]
): Promise<{
    success: boolean;
    message?: string;
    errors?: string[];
    data?: { voterId: string; password: string }[];
}> {
    try {
        await verifyAdminSession('voters');

        if (!Array.isArray(voters) || voters.length === 0) {
            return { success: false, message: 'Tidak ada data pemilih untuk diimpor.' };
        }

        const importResult = importVotersSchema.safeParse(voters);
        if (!importResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validVoters = importResult.data;

        // Fetch categories for mapping
        const categories = await prisma.category.findMany();

        if (!categories || categories.length === 0) {
            return { success: false, message: 'Tidak ada kategori di database. Buat kategori terlebih dahulu.' };
        }

        const categoryNameMap = new Map<string, string>();
        categories.forEach((cat: any) => {
            categoryNameMap.set(normalizeCategory(cat.name), cat.id);
        });

        const votersToInsert: any[] = [];
        const temporaryPasswords: { voterId: string; password: string }[] = [];
        const errors: string[] = [];

        for (const voterData of validVoters) {
            const id = voterData.id;
            if (!id) {
                errors.push(`Data baris tanpa ID dilewati: ${voterData.name}`);
                continue;
            }

            const normalizedCatName = normalizeCategory(voterData.category);
            const categoryId = categoryNameMap.get(normalizedCatName);

            if (!categoryId) {
                errors.push(`Kategori '${voterData.category}' untuk ${voterData.name} (ID: ${id}) tidak ditemukan.`);
                continue;
            }

            const plainPassword = voterData.password || generateReadablePassword();

            const hashedPassword = await hashPassword(plainPassword);

            temporaryPasswords.push({
                voterId: id,
                password: plainPassword,
            });

            votersToInsert.push({
                id: id,
                name: voterData.name || '',
                categoryId: categoryId,
                password: hashedPassword,
                nik: voterData.nik || '',
                birthPlace: voterData.birthPlace || '',
                birthDate: voterData.birthDate || '',
                gender: voterData.gender || null,
                address: voterData.address || '',
                hasVoted: {},
            });
        }

        if (errors.length > 0) {
            return { success: false, message: 'Impor dibatalkan karena ada error.', errors };
        }

        if (votersToInsert.length > 0) {
            // Prisma upsert for batch - use createMany with skipDuplicates or transaction
            for (const voter of votersToInsert) {
                await prisma.voter.upsert({
                    where: { id: voter.id },
                    create: voter,
                    update: {
                        name: voter.name,
                        categoryId: voter.categoryId,
                        password: voter.password,
                        nik: voter.nik,
                        birthPlace: voter.birthPlace,
                        birthDate: voter.birthDate,
                        gender: voter.gender,
                        address: voter.address,
                    }
                });
            }
        }

        logger.info({ count: votersToInsert.length }, 'Voters imported');
        revalidatePath('/admin/voters');
        return {
            success: true,
            message: `${votersToInsert.length} pemilih berhasil diimpor.`,
            data: temporaryPasswords,
        };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed importing voters');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error importing voters');
        return { success: false, message: 'Gagal mengimpor data pemilih.' };
    }
}
