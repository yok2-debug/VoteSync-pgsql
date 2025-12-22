'use server';

import { prisma } from '@/lib/prisma';
import type { Election, Candidate } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';

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

        const elections = electionsData.map((e: { id: string; name: string; description: string | null; startDate: string | null; endDate: string | null; status: string; useWitnesses: boolean; showInRealCount: boolean; isMainInRealCount: boolean }) => ({
            id: e.id,
            name: e.name,
            description: e.description || undefined,
            startDate: e.startDate || undefined,
            endDate: e.endDate || undefined,
            status: e.status as 'active' | 'pending',
            useWitnesses: e.useWitnesses || false,
            showInRealCount: e.showInRealCount || false,
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

        const election = await prisma.election.findUnique({
            where: { id }
        });

        if (!election) {
            return { success: false, message: 'Pemilihan tidak ditemukan.' };
        }

        // Fetch candidates for this election
        const candidatesData = await prisma.candidate.findMany({
            where: { electionId: id }
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
            where: { electionId: id },
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

        const electionId = `election-${Date.now()}`;

        await prisma.election.create({
            data: {
                id: electionId,
                name: data.name,
                description: data.description || '',
                startDate: data.startDate || null,
                endDate: data.endDate || null,
                status: data.status || 'pending',
                useWitnesses: data.useWitnesses || false,
            }
        });

        const newElection: Election = {
            id: electionId,
            name: data.name,
            description: data.description,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status || 'pending',
            useWitnesses: data.useWitnesses || false,
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

        const existing = await prisma.election.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, message: 'Pemilihan tidak ditemukan.' };
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description || '';
        if (data.startDate !== undefined) updateData.startDate = data.startDate;
        if (data.endDate !== undefined) updateData.endDate = data.endDate;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.useWitnesses !== undefined) updateData.useWitnesses = data.useWitnesses;

        await prisma.election.update({
            where: { id },
            data: updateData
        });

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

        const existing = await prisma.election.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, message: 'Pemilihan tidak ditemukan.' };
        }

        // Delete candidates first (cascade should handle this, but explicit is safer)
        await prisma.candidate.deleteMany({
            where: { electionId: id }
        });

        // Delete votes for this election
        await prisma.vote.deleteMany({
            where: { electionId: id }
        });

        // Delete the election
        await prisma.election.delete({
            where: { id }
        });

        // Clean up orphaned election references in categories
        const categories = await prisma.category.findMany();

        if (categories) {
            for (const category of categories) {
                const allowedElections = category.allowedElections || [];
                if (allowedElections.includes(id)) {
                    const updatedElections = allowedElections.filter((eId: string) => eId !== id);
                    await prisma.category.update({
                        where: { id: category.id },
                        data: { allowedElections: updatedElections }
                    });
                }
            }
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
