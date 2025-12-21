'use server';

import { prisma } from '@/lib/prisma';
import type { Candidate } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

export async function createCandidate(
    electionId: string,
    data: Omit<Candidate, 'id' | 'orderNumber'> & { voterId?: string }
): Promise<{ success: boolean; message?: string; data?: Candidate }> {
    try {
        await verifyAdminSession('candidates');

        if (!electionId) {
            return { success: false, message: 'ID Pemilihan wajib diisi.' };
        }
        if (!data.name) {
            return { success: false, message: 'Nama kandidat wajib diisi.' };
        }

        // Check if election exists
        const election = await prisma.election.findUnique({
            where: { id: electionId }
        });

        if (!election) {
            return { success: false, message: 'Pemilihan tidak ditemukan' };
        }

        // Use voterId if provided, otherwise generate unique ID
        const candidateId = data.voterId || `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Check if candidate already exists
        const existingCandidate = await prisma.candidate.findFirst({
            where: { id: candidateId, electionId }
        });

        if (existingCandidate) {
            return { success: false, message: 'Kandidat sudah terdaftar dalam pemilihan ini.' };
        }

        // Get max order number
        const maxOrderCandidate = await prisma.candidate.findFirst({
            where: { electionId },
            orderBy: { orderNumber: 'desc' }
        });

        const maxOrder = maxOrderCandidate?.orderNumber || 0;
        const newOrder = maxOrder + 1;

        await prisma.candidate.create({
            data: {
                id: candidateId,
                electionId,
                name: data.name,
                viceCandidateName: data.viceCandidateName || null,
                vision: data.vision || null,
                mission: data.mission || null,
                photoUrl: data.photo || null,
                orderNumber: newOrder,
            }
        });

        const newCandidate: Candidate = {
            id: candidateId,
            name: data.name,
            viceCandidateName: data.viceCandidateName,
            vision: data.vision,
            mission: data.mission,
            photo: data.photo,
            orderNumber: newOrder,
        };

        logger.info({ electionId, candidateId }, 'Candidate created');
        revalidatePath('/admin/candidates');
        return { success: true, message: 'Kandidat berhasil ditambahkan', data: newCandidate };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed creating candidate');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error creating candidate');
        return { success: false, message: error.message || 'Gagal menambahkan kandidat' };
    }
}

export async function updateCandidate(
    originalElectionId: string,
    candidateId: string,
    data: Partial<Omit<Candidate, 'id'>> & { electionId?: string }
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('candidates');

        const targetElectionId = data.electionId || originalElectionId;
        const isTransfer = targetElectionId !== originalElectionId;

        if (isTransfer) {
            // Get old candidate data
            const oldCandidate = await prisma.candidate.findFirst({
                where: { id: candidateId, electionId: originalElectionId }
            });

            if (!oldCandidate) {
                return { success: false, message: 'Kandidat asal tidak ditemukan' };
            }

            // Check target election exists
            const targetElection = await prisma.election.findUnique({
                where: { id: targetElectionId }
            });

            if (!targetElection) {
                return { success: false, message: 'Pemilihan tujuan tidak ditemukan' };
            }

            // Delete from old election
            await prisma.candidate.deleteMany({
                where: { id: candidateId, electionId: originalElectionId }
            });

            // Insert to new election
            await prisma.candidate.create({
                data: {
                    id: candidateId,
                    electionId: targetElectionId,
                    name: data.name || oldCandidate.name,
                    viceCandidateName: data.viceCandidateName !== undefined ? data.viceCandidateName : oldCandidate.viceCandidateName,
                    vision: data.vision !== undefined ? data.vision : oldCandidate.vision,
                    mission: data.mission !== undefined ? data.mission : oldCandidate.mission,
                    photoUrl: data.photo !== undefined ? data.photo : oldCandidate.photoUrl,
                    orderNumber: data.orderNumber !== undefined ? data.orderNumber : oldCandidate.orderNumber,
                }
            });

            logger.info({ from: originalElectionId, to: targetElectionId, candidateId }, 'Candidate transferred');
        } else {
            // Normal update
            const existingCandidate = await prisma.candidate.findFirst({
                where: { id: candidateId, electionId: originalElectionId }
            });

            if (!existingCandidate) {
                return { success: false, message: 'Kandidat tidak ditemukan' };
            }

            const updateData: any = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.viceCandidateName !== undefined) updateData.viceCandidateName = data.viceCandidateName;
            if (data.vision !== undefined) updateData.vision = data.vision;
            if (data.mission !== undefined) updateData.mission = data.mission;
            if (data.photo !== undefined) updateData.photoUrl = data.photo;
            if (data.orderNumber !== undefined) updateData.orderNumber = data.orderNumber;

            await prisma.candidate.updateMany({
                where: { id: candidateId, electionId: originalElectionId },
                data: updateData
            });

            logger.info({ electionId: originalElectionId, candidateId }, 'Candidate updated');
        }

        revalidatePath('/admin/candidates');
        return { success: true, message: 'Kandidat berhasil diperbarui' };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed updating candidate');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error updating candidate');
        return { success: false, message: error.message || 'Gagal memperbarui kandidat' };
    }
}

export async function deleteCandidate(
    electionId: string,
    candidateId: string
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('candidates');

        const existingCandidate = await prisma.candidate.findFirst({
            where: { id: candidateId, electionId }
        });

        if (!existingCandidate) {
            return { success: false, message: 'Kandidat tidak ditemukan' };
        }

        await prisma.candidate.deleteMany({
            where: { id: candidateId, electionId }
        });

        logger.info({ electionId, candidateId }, 'Candidate deleted');
        revalidatePath('/admin/candidates');
        return { success: true, message: 'Kandidat berhasil dihapus' };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed deleting candidate');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error deleting candidate');
        return { success: false, message: error.message || 'Gagal menghapus kandidat' };
    }
}

export async function reorderCandidates(
    electionId: string,
    candidates: Array<{ id: string; orderNumber?: number }>
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('candidates');

        if (!electionId || !Array.isArray(candidates)) {
            return { success: false, message: 'Data tidak valid' };
        }

        // Update each candidate's order
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            if (candidate.id) {
                await prisma.candidate.updateMany({
                    where: { id: candidate.id, electionId },
                    data: { orderNumber: i + 1 }
                });
            }
        }

        logger.info({ electionId, count: candidates.length }, 'Candidates reordered');
        revalidatePath('/admin/candidates');
        return { success: true, message: 'Urutan kandidat berhasil diperbarui' };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed reordering candidates');
            return { success: false, message: error.message };
        }
        logger.error({ err: error }, 'Error reordering candidates');
        return { success: false, message: 'Gagal memperbarui urutan kandidat' };
    }
}
