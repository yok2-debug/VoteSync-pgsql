'use server';

import { prisma } from '@/lib/prisma';
import type { Voter } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { getVoterSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import { hashPassword, generateReadablePassword } from '@/lib/password';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { randomInt } from 'node:crypto';
import { acquireElectionOperationLock } from '@/lib/election-lock';

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
    name: z.string().optional(),
    category: z.string().optional(),
    nik: z.string().optional(),
    birthPlace: z.string().optional(),
    birthDate: z.string().optional(),
    gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
    address: z.string().optional(),
});

const importVotersSchema = z.array(importVoterSchema).min(1);

function generateImportVoterId(): string {
    const chars = 'ABCDEFGHJKMNPQRTUVWXY';

    let letters = '';
    for (let i = 0; i < 2; i++) {
        letters += chars[randomInt(chars.length)];
    }

    const number = randomInt(100000, 1000000);

    return `${letters}-${number}`;
}

export async function getVoters(): Promise<{ success: boolean; data?: Voter[]; message?: string }> {
    try {
        await verifyAdminSession('voters');

        const voters = await prisma.voter.findMany({
            select: {
                id: true,
                name: true,
                categoryId: true,
                nik: true,
                hasVoted: true,
            },
        });

        if (!voters || voters.length === 0) {
            return { success: true, data: [] };
        }

        // Map to Voter type
        const sanitizedVoters = voters.map((voter) => ({
            id: voter.id,
            name: voter.name,
            category: voter.categoryId || '',
            nik: voter.nik || undefined,
            hasVoted: (voter.hasVoted as Record<string, boolean>) || {},
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

// Admin voter counts for the Real Count display.
// Requires the real_count permission and includes all voter categories.
export async function getAdminVoterCountsByCategory(): Promise<{
    success: boolean;
    data?: Record<string, number>;
    message?: string;
}> {
    try {
        await verifyAdminSession('real_count');

        const voterCounts = await prisma.voter.groupBy({
            by: ['categoryId'],
            _count: {
                _all: true,
            },
        });

        const counts: Record<string, number> = {};

        voterCounts.forEach((row) => {
            if (row.categoryId) {
                counts[row.categoryId] = row._count._all;
            }
        });

        return { success: true, data: counts };
    } catch (error) {
        logger.error({ err: error }, 'Error counting admin voter statistics');
        return {
            success: false,
            message: 'Gagal menghitung statistik pemilih.',
        };
    }
}

// Public voter counts for the Real Count display.
// Returns DPT directly per ended election.
// No individual voter data is exposed.
export async function getPublicRealCountVoterCountsByElection(): Promise<{
    success: boolean;
    data?: Record<string, number>;
    message?: string;
}> {
    try {
        const now = new Date();

        const elections = await prisma.election.findMany({
            select: {
                id: true,
                endDate: true,
            },
        });

        const endedElections = elections.filter((e) => {
            if (!e.endDate) {
                return false;
            }

            return now >= new Date(e.endDate);
        });

        if (endedElections.length === 0) {
            return { success: true, data: {} };
        }

        const endedElectionIds = endedElections.map((e) => e.id);

        const categories = await prisma.category.findMany({
            where: {
                allowedElections: {
                    hasSome: endedElectionIds,
                },
            },
            select: {
                id: true,
                allowedElections: true,
            },
        });

        const categoryIdsByElection: Record<string, Set<string>> = {};

        for (const election of endedElections) {
            categoryIdsByElection[election.id] = new Set(
                categories
                    .filter((category) =>
                        category.allowedElections.includes(election.id)
                    )
                    .map((category) => category.id)
            );
        }

        const allCategoryIds = [
            ...new Set(categories.map((category) => category.id)),
        ];

        if (allCategoryIds.length === 0) {
            return {
                success: true,
                data: Object.fromEntries(
                    endedElectionIds.map((id) => [id, 0])
                ),
            };
        }

        const voterCounts = await prisma.voter.groupBy({
            by: ['categoryId'],
            where: {
                categoryId: {
                    in: allCategoryIds,
                },
            },
            _count: {
                _all: true,
            },
        });

        const countsByCategory: Record<string, number> = {};

        voterCounts.forEach((row) => {
            if (row.categoryId) {
                countsByCategory[row.categoryId] = row._count._all;
            }
        });

        const countsByElection: Record<string, number> = {};

        for (const electionId of endedElectionIds) {
            let total = 0;

            categoryIdsByElection[electionId].forEach((categoryId) => {
                total += countsByCategory[categoryId] || 0;
            });

            countsByElection[electionId] = total;
        }

        return {
            success: true,
            data: countsByElection,
        };
    } catch (error) {
        logger.error(
            { err: error },
            'Error counting public Real Count voter statistics'
        );
        return {
            success: false,
            message: 'Gagal menghitung statistik pemilih.',
        };
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

        await prisma.$transaction(async (tx) => {
            // Assigning a voter to a category changes voting eligibility.
            // Serialize voter creation against voting and other eligibility changes.
            await acquireElectionOperationLock(tx, 'exclusive');

            await tx.voter.create({
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
        });

        logger.info({ voterId }, 'Voter created');
        revalidatePath('/admin/voters');
        return {
            success: true,
            message: 'Pemilih berhasil dibuat',
            data: {
                voterId: voterId,
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

        // Perubahan categoryId memengaruhi hak suara dan harus
        // diserialisasi terhadap proses voting.
        if (updateData.categoryId !== undefined) {
            await prisma.$transaction(async (tx) => {
                await acquireElectionOperationLock(tx, 'exclusive');

                await tx.voter.update({
                    where: { id: validVoterId },
                    data: updateData
                });
            });
        } else {
            await prisma.voter.update({
                where: { id: validVoterId },
                data: updateData
            });
        }

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

        await prisma.$transaction(async (tx) => {
            // Serialize voter deletion against voting and other
            // operations that can change voter eligibility.
            await acquireElectionOperationLock(tx, 'exclusive');

            await tx.voter.deleteMany({
                where: { id: { in: validVoterIds } }
            });
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

        const updated = await prisma.$transaction(async (tx) => {
            // Changing voter category changes voting eligibility.
            // Serialize the validation and update against voting.
            await acquireElectionOperationLock(tx, 'exclusive');

            const category = await tx.category.findUnique({
                where: { id: validCategoryId },
                select: { id: true }
            });

            if (!category) {
                return false;
            }

            await tx.voter.updateMany({
                where: { id: { in: validVoterIds } },
                data: { categoryId: validCategoryId }
            });

            return true;
        });

        if (!updated) {
            return {
                success: false,
                message: 'Kategori tidak ditemukan.'
            };
        }

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

        // Generate and hash all temporary passwords before opening
        // the database transaction so bcrypt does not hold a DB
        // transaction open unnecessarily.
        const passwordResets: {
            voterId: string;
            plainPassword: string;
            hashedPassword: string;
        }[] = [];

        for (const voter of voters) {
            const plainPassword = generateReadablePassword();
            const hashedPassword = await hashPassword(plainPassword);

            passwordResets.push({
                voterId: voter.id,
                plainPassword,
                hashedPassword,
            });
        }

        // Apply all password resets atomically. If any update fails,
        // none of the password changes are committed.
        await prisma.$transaction(
            passwordResets.map((reset) =>
                prisma.voter.update({
                    where: { id: reset.voterId },
                    data: {
                        password: reset.hashedPassword,
                        sessionVersion: {
                            increment: 1,
                        },
                    },
                })
            )
        );

        const temporaryPasswords = passwordResets.map((reset) => ({
            voterId: reset.voterId,
            password: reset.plainPassword,
        }));

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

        const generatedIds = new Set<string>();

        for (const voterData of validVoters) {
            let id = '';
            let attempts = 0;

            while (attempts < 20) {
                const candidateId = generateImportVoterId();

                if (generatedIds.has(candidateId)) {
                    attempts++;
                    continue;
                }

                const existing = await prisma.voter.findUnique({
                    where: { id: candidateId },
                    select: { id: true },
                });

                if (!existing) {
                    id = candidateId;
                    generatedIds.add(candidateId);
                    break;
                }

                attempts++;
            }

            if (!id) {
                errors.push(`Gagal membuat ID unik untuk ${voterData.name || 'pemilih'}.`);
                continue;
            }

            if (!voterData.category) {
                errors.push(`Kategori untuk ${voterData.name} (ID: ${id}) tidak diisi.`);
                continue;
            }

            const normalizedCatName = normalizeCategory(voterData.category);
            const categoryId = categoryNameMap.get(normalizedCatName);

            if (!categoryId) {
                errors.push(`Kategori '${voterData.category}' untuk ${voterData.name} (ID: ${id}) tidak ditemukan.`);
                continue;
            }

            const validCategoryId: string = categoryId;
            const plainPassword = generateReadablePassword();
            const hashedPassword = await hashPassword(plainPassword);

            temporaryPasswords.push({
                voterId: id,
                password: plainPassword,
            });

            votersToInsert.push({
                id,
                name: voterData.name || '',
                categoryId: validCategoryId,
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
            // Imported voters are newly created and receive generated IDs.
            // Keep the complete batch under one exclusive election lock
            // and one database transaction.
            await prisma.$transaction(async (tx) => {
                await acquireElectionOperationLock(tx, 'exclusive');

                for (const voter of votersToInsert) {
                    await tx.voter.create({
                        data: voter,
                    });
                }
            });
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
