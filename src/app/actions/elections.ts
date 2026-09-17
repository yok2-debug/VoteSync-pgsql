'use server';

import { prisma } from '@/lib/prisma';
import type { Election, Candidate } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { acquireElectionOperationLock } from '@/lib/election-lock';

const electionIdSchema = z.string().min(1);

const createElectionSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['active', 'pending']).optional(),
    useWitnesses: z.boolean().optional(),
});

const updateElectionSchema = createElectionSchema.partial();

export async function getElections(): Promise<{ success: boolean; data?: Election[]; message?: string }> {
    try {
        await verifyAdminSession();

        const electionsData = await prisma.election.findMany();

        if (!electionsData || electionsData.length === 0) {
            return { success: true, data: [] };
        }

        // Fetch candidates for each election
        const candidatesData = await prisma.candidate.findMany();

        const candidatesByElection: Record<string, Record<string, Candidate>> = {};
        if (candidatesData) {
            candidatesData.forEach((c: { id: string; electionId: string; name: string; viceCandidateName: string | null; vision: string | null; mission: string | null; photoUrl: string | null; orderNumber: number }) => {
                if (!candidatesByElection[c.electionId]) {
                    candidatesByElection[c.electionId] = {};
                }
                candidatesByElection[c.electionId][c.id] = {
                    id: c.id,
                    name: c.name,
                    viceCandidateName: c.viceCandidateName || undefined,
                    vision: c.vision || undefined,
                    mission: c.mission || undefined,
                    photo: c.photoUrl || undefined,
                    orderNumber: c.orderNumber,
                };
            });
        }

        const elections = electionsData.map((e: { id: string; name: string; description: string | null; startDate: string | null; endDate: string | null; status: string; useWitnesses: boolean; isMainInRealCount: boolean }) => ({
            id: e.id,
            name: e.name,
            description: e.description || undefined,
            startDate: e.startDate || undefined,
            endDate: e.endDate || undefined,
            status: e.status as 'active' | 'pending',
            useWitnesses: e.useWitnesses || false,
            isMainInRealCount: e.isMainInRealCount || false,
            candidates: candidatesByElection[e.id] || {},
        })) as Election[];

        return { success: true, data: elections };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed fetching elections');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error fetching elections');
        return { success: false, message: 'Gagal mengambil data pemilihan.' };
    }
}

export async function getElection(id: string): Promise<{ success: boolean; data?: Election; message?: string }> {
    try {
        await verifyAdminSession();
        const idResult = electionIdSchema.safeParse(id);
        if (!idResult.success) return { success: false, message: 'Data tidak valid.' };
        const validId = idResult.data;

        const election = await prisma.election.findUnique({
            where: { id: validId }
        });

        if (!election) {
            return { success: false, message: 'Pemilihan tidak ditemukan.' };
        }

        // Fetch candidates for this election
        const candidatesData = await prisma.candidate.findMany({
            where: { electionId: validId }
        });

        const candidates: Record<string, Candidate> = {};
        if (candidatesData) {
            candidatesData.forEach((c: { id: string; electionId: string; name: string; viceCandidateName: string | null; vision: string | null; mission: string | null; photoUrl: string | null; orderNumber: number }) => {
                candidates[c.id] = {
                    id: c.id,
                    name: c.name,
                    viceCandidateName: c.viceCandidateName || undefined,
                    vision: c.vision || undefined,
                    mission: c.mission || undefined,
                    photo: c.photoUrl || undefined,
                    orderNumber: c.orderNumber,
                };
            });
        }

        // Fetch vote counts for this election
        const votesData = await prisma.vote.findMany({
            where: { electionId: validId },
            select: { candidateId: true }
        });

        // Count votes per candidate
        const results: Record<string, number> = {};
        if (votesData) {
            votesData.forEach((v: { candidateId: string }) => {
                if (!results[v.candidateId]) {
                    results[v.candidateId] = 0;
                }
                results[v.candidateId]++;
            });
        }

        const mappedElection: Election = {
            id: election.id,
            name: election.name,
            description: election.description || undefined,
            startDate: election.startDate || undefined,
            endDate: election.endDate || undefined,
            status: election.status as 'active' | 'pending',
            useWitnesses: election.useWitnesses || false,
            candidates,
            results,
        };

        return { success: true, data: mappedElection };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message, electionId: id }, 'Authentication failed fetching election');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error fetching election');
        return { success: false, message: 'Gagal mengambil data pemilihan.' };
    }
}

export async function createElection(
    data: Omit<Election, 'id' | 'candidates'>
): Promise<{ success: boolean; message?: string; data?: Election }> {
    try {
        await verifyAdminSession('elections');

        const dataResult = createElectionSchema.safeParse(data);
        if (!dataResult.success) return { success: false, message: 'Data tidak valid.' };
        const validData = dataResult.data;

        const electionId = `election-${Date.now()}`;

        await prisma.election.create({
            data: {
                id: electionId,
                name: validData.name,
                description: validData.description || '',
                startDate: validData.startDate || null,
                endDate: validData.endDate || null,
                status: validData.status || 'pending',
                useWitnesses: validData.useWitnesses || false,
            }
        });

        const newElection: Election = {
            id: electionId,
            name: validData.name,
            description: validData.description,
            startDate: validData.startDate,
            endDate: validData.endDate,
            status: validData.status || 'pending',
            useWitnesses: validData.useWitnesses || false,
            candidates: {},
        };

        logger.info({ electionId }, 'Election created');
        return { success: true, data: newElection, message: 'Pemilihan berhasil dibuat.' };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed creating election');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error creating election');
        return { success: false, message: 'Gagal membuat pemilihan.' };
    }
}

export async function updateElection(
    id: string,
    data: Partial<Omit<Election, 'id' | 'candidates'>>
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('elections');

        const idResult = electionIdSchema.safeParse(id);
        const dataResult = updateElectionSchema.safeParse(data);
        if (!idResult.success || !dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validId = idResult.data;
        const validData = dataResult.data;

        const updateData: any = {};
        if (validData.name !== undefined) updateData.name = validData.name;
        if (validData.description !== undefined) updateData.description = validData.description || '';
        if (validData.startDate !== undefined) updateData.startDate = validData.startDate;
        if (validData.endDate !== undefined) updateData.endDate = validData.endDate;
        if (validData.status !== undefined) updateData.status = validData.status;
        if (validData.useWitnesses !== undefined) updateData.useWitnesses = validData.useWitnesses;

        const electionEligibilityChanged =
            validData.startDate !== undefined ||
            validData.endDate !== undefined ||
            validData.status !== undefined;

        const updated = await prisma.$transaction(async (tx) => {
            // Status and voting time changes affect whether voting is allowed.
            // They must exclude voting transactions.
            // Other election metadata can use the shared lock.
            await acquireElectionOperationLock(
                tx,
                electionEligibilityChanged ? 'exclusive' : 'shared'
            );

            const existing = await tx.election.findUnique({
                where: { id: validId }
            });

            if (!existing) {
                return false;
            }

            await tx.election.update({
                where: { id: validId },
                data: updateData
            });

            return true;
        });

        if (!updated) {
            return { success: false, message: 'Pemilihan tidak ditemukan.' };
        }

        logger.info({ electionId: id }, 'Election updated');
        return { success: true, message: 'Pemilihan berhasil diperbarui.' };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message, electionId: id }, 'Authentication failed updating election');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error updating election');
        return { success: false, message: 'Gagal memperbarui pemilihan.' };
    }
}

export async function deleteElection(id: string): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('elections');

        const idResult = electionIdSchema.safeParse(id);
        if (!idResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validId = idResult.data;

        const deleted = await prisma.$transaction(async (tx) => {
            // Serialize destructive election operations against voting.
            await acquireElectionOperationLock(tx, 'exclusive');

            const existing = await tx.election.findUnique({
                where: { id: validId }
            });

            if (!existing) {
                return false;
            }

            // Delete votes first because they reference candidates.
            await tx.vote.deleteMany({
                where: { electionId: validId }
            });

            // Delete candidates belonging to this election.
            await tx.candidate.deleteMany({
                where: { electionId: validId }
            });

            // Remove the election from category allowedElections.
            const categories = await tx.category.findMany({
                where: {
                    allowedElections: {
                        has: validId
                    }
                },
                select: {
                    id: true,
                    allowedElections: true
                }
            });

            for (const category of categories) {
                const updatedElections = category.allowedElections.filter(
                    (electionId: string) => electionId !== validId
                );

                await tx.category.update({
                    where: { id: category.id },
                    data: { allowedElections: updatedElections }
                });
            }

            // Delete the election itself.
            await tx.election.delete({
                where: { id: validId }
            });

            return true;
        });

        if (!deleted) {
            return { success: false, message: 'Pemilihan tidak ditemukan.' };
        }

        logger.info({ electionId: id }, 'Election deleted');
        return { success: true, message: 'Pemilihan berhasil dihapus.' };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message, electionId: id }, 'Authentication failed deleting election');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error deleting election');
        return { success: false, message: 'Gagal menghapus pemilihan.' };
    }
}
