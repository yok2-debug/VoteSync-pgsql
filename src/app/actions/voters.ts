'use server';

import { prisma } from '@/lib/prisma';
import type { Voter } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { getVoterSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import { hashPassword, generateReadablePassword } from '@/lib/password';
import { revalidatePath } from 'next/cache';

export async function getVoters(options?: { includeSensitive?: boolean }): Promise<{ success: boolean; data?: Voter[]; message?: string }> {
    try {
        await verifyAdminSession('voters');

        const voters = await prisma.voter.findMany();

        if (!voters || voters.length === 0) {
            return { success: true, data: [] };
        }

        // Map to Voter type
        const mappedVoters = voters.map((v: any) => ({
            id: v.id,
            name: v.name,
            category: v.categoryId || '',
            password: v.password,
            nik: v.nik || undefined,
            birthPlace: v.birthPlace || undefined,
            birthDate: v.birthDate || undefined,
            gender: v.gender as 'Laki-laki' | 'Perempuan' | undefined,
            address: v.address || undefined,
            hasVoted: (v.hasVoted as Record<string, boolean>) || {},
        })) as Voter[];

        if (options?.includeSensitive) {
            return { success: true, data: mappedVoters };
        }

        const sanitizedVoters = mappedVoters.map(({ password, ...voter }) => voter as Voter);

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

        const voter = await prisma.voter.findUnique({
            where: { id: voterId }
        });

        if (!voter) {
            return { success: false, message: 'Pemilih tidak ditemukan.' };
        }

        const mappedVoter: Voter = {
            id: voter.id,
            name: voter.name,
            category: voter.categoryId || '',
            password: voter.password,
            nik: voter.nik || undefined,
            birthPlace: voter.birthPlace || undefined,
            birthDate: voter.birthDate || undefined,
            gender: voter.gender as 'Laki-laki' | 'Perempuan' | undefined,
            address: voter.address || undefined,
            hasVoted: (voter.hasVoted as Record<string, boolean>) || {},
        };

        const { password, ...sanitizedVoter } = mappedVoter;

        return { success: true, data: sanitizedVoter as Voter };
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

// --- Mutations ---

export async function createVoter(data: Partial<Voter>): Promise<{ success: boolean; message?: string; data?: Voter }> {
    try {
        await verifyAdminSession('voters');

        // Generate custom voter ID if not provided
        let voterId = data.id;

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

        const plainPassword = data.password || generateReadablePassword();
        // Storing password as plain text as requested
        const hashedPassword = plainPassword;

        await prisma.voter.create({
            data: {
                id: voterId,
                name: data.name || '',
                categoryId: data.category || null,
                password: hashedPassword,
                nik: data.nik || '',
                birthPlace: data.birthPlace || '',
                birthDate: data.birthDate || '',
                gender: data.gender || null,
                address: data.address || '',
                hasVoted: {},
            }
        });

        const newVoterData: Voter = {
            id: voterId,
            name: data.name || '',
            category: data.category || '',
            password: plainPassword,
            nik: data.nik || '',
            birthPlace: data.birthPlace || '',
            birthDate: data.birthDate || '',
            gender: data.gender,
            address: data.address || '',
            hasVoted: {},
        };

        logger.info({ voterId }, 'Voter created');
        revalidatePath('/admin/voters');
        return { success: true, message: 'Pemilih berhasil dibuat', data: newVoterData };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed creating voter');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error creating voter');
        return { success: false, message: 'Gagal membuat pemilih.' };
    }
}

export async function updateVoter(voterId: string, data: Partial<Voter>): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('voters');

        const existingVoter = await prisma.voter.findUnique({
            where: { id: voterId }
        });

        if (!existingVoter) {
            return { success: false, message: 'Pemilih tidak ditemukan' };
        }

        const { password, ...restData } = data;
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
            updateData.password = password;
        }

        await prisma.voter.update({
            where: { id: voterId },
            data: updateData
        });

        logger.info({ voterId }, 'Voter updated');
        revalidatePath('/admin/voters');
        return { success: true, message: 'Pemilih berhasil diperbarui' };

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

        if (!voterIds || voterIds.length === 0) {
            return { success: false, message: 'Tidak ada ID pemilih yang dipilih' };
        }

        await prisma.voter.deleteMany({
            where: { id: { in: voterIds } }
        });

        logger.info({ admin: session.username, count: voterIds.length }, 'Voters deleted');
        revalidatePath('/admin/voters');
        return { success: true, message: `${voterIds.length} pemilih berhasil dihapus` };

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

        if (!Array.isArray(voterIds) || voterIds.length === 0 || !newCategoryId) {
            return { success: false, message: 'Data tidak valid.' };
        }

        await prisma.voter.updateMany({
            where: { id: { in: voterIds } },
            data: { categoryId: newCategoryId }
        });

        revalidatePath('/admin/voters');
        return { success: true, message: `${voterIds.length} pemilih berhasil diperbarui.` };

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
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('voters');

        if (!voterId || !newPassword) {
            return { success: false, message: 'ID Pemilih dan kata sandi baru wajib diisi.' };
        }
        if (newPassword.length < 6) {
            return { success: false, message: 'Kata sandi minimal harus 6 karakter.' };
        }

        const voter = await prisma.voter.findUnique({
            where: { id: voterId }
        });

        if (!voter) {
            return { success: false, message: 'Pemilih tidak ditemukan.' };
        }

        await prisma.voter.update({
            where: { id: voterId },
            data: { password: newPassword }
        });

        logger.info({ voterId }, 'Voter password reset');
        return { success: true, message: 'Kata sandi berhasil direset.' };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed resetting password');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error resetting password');
        return { success: false, message: 'Gagal mereset kata sandi.' };
    }
}

export async function importVoters(
    voters: any[]
): Promise<{ success: boolean; message?: string; errors?: string[] }> {
    try {
        await verifyAdminSession('voters');

        if (!Array.isArray(voters) || voters.length === 0) {
            return { success: false, message: 'Tidak ada data pemilih untuk diimpor.' };
        }

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
        const errors: string[] = [];

        for (const voterData of voters) {
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
            // Storing password as plain text as requested
            const hashedPassword = plainPassword;

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
        return { success: true, message: `${votersToInsert.length} pemilih berhasil diimpor.` };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed importing voters');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error importing voters');
        return { success: false, message: 'Gagal mengimpor data pemilih.' };
    }
}
