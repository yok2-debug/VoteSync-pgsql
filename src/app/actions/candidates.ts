'use server';

import { prisma } from '@/lib/prisma';
import type { Candidate } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const candidateIdSchema = z.string().min(1);

const candidateCreateSchema = z.object({
    name: z.string().trim().min(1),
    viceCandidateId: z.string().min(1).optional(),
    viceCandidateName: z.string().optional(),
    photo: z.string().optional(),
    vision: z.string().optional(),
    mission: z.string().optional(),
    voterId: z.string().min(1).optional(),
});

const candidateUpdateSchema = candidateCreateSchema.partial().extend({
    orderNumber: z.number().int().min(1).optional(),
    electionId: z.string().min(1).optional(),
});

const reorderCandidateSchema = z.object({
    id: z.string().min(1),
    orderNumber: z.number().int().min(1).optional(),
});

export async function createCandidate(
    electionId: string,
    data: Omit<Candidate, 'id' | 'orderNumber'> & { voterId?: string }
): Promise<{ success: boolean; message?: string; data?: Candidate }> {
    try {
        await verifyAdminSession('candidates');

        const electionIdResult = candidateIdSchema.safeParse(electionId);
        const dataResult = candidateCreateSchema.safeParse(data);
        if (!electionIdResult.success || !dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validElectionId = electionIdResult.data;
        const validData = dataResult.data;

        // Check if election exists
        const election = await prisma.election.findUnique({
            where: { id: validElectionId }
        });

        if (!election) {
            return { success: false, message: 'Pemilihan tidak ditemukan' };
        }

        // Use voterId if provided, otherwise generate unique ID
        const candidateId = validData.voterId || `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Check if candidate already exists
        const existingCandidate = await prisma.candidate.findFirst({
            where: { id: candidateId, electionId: validElectionId }
        });

        if (existingCandidate) {
            return { success: false, message: 'Kandidat sudah terdaftar dalam pemilihan ini.' };
        }

        // Get max order number
        const maxOrderCandidate = await prisma.candidate.findFirst({
            where: { electionId: validElectionId },
            orderBy: { orderNumber: 'desc' }
        });

        const maxOrder = maxOrderCandidate?.orderNumber || 0;
        const newOrder = maxOrder + 1;

        await prisma.candidate.create({
            data: {
                id: candidateId,
                electionId: validElectionId,
                name: validData.name,
                viceCandidateName: validData.viceCandidateName || null,
                vision: validData.vision || null,
                mission: validData.mission || null,
                photoUrl: validData.photo || null,
                orderNumber: newOrder,
            }
        });

        const newCandidate: Candidate = {
            id: candidateId,
            name: validData.name,
            viceCandidateName: validData.viceCandidateName,
            vision: validData.vision,
            mission: validData.mission,
            photo: validData.photo,
            orderNumber: newOrder,
        };

        logger.info({ electionId: validElectionId, candidateId }, 'Candidate created');
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

        const originalElectionIdResult = candidateIdSchema.safeParse(originalElectionId);
        const candidateIdResult = candidateIdSchema.safeParse(candidateId);
        const dataResult = candidateUpdateSchema.safeParse(data);

        if (!originalElectionIdResult.success || !candidateIdResult.success || !dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }

        const validOriginalElectionId = originalElectionIdResult.data;
        const validCandidateId = candidateIdResult.data;
        const validData = dataResult.data;
        if (Object.keys(validData).length === 0) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const targetElectionId = validData.electionId || validOriginalElectionId;
        const isTransfer = targetElectionId !== validOriginalElectionId;

        if (isTransfer) {
            // Get old candidate data
            const oldCandidate = await prisma.candidate.findFirst({
                where: { id: validCandidateId, electionId: validOriginalElectionId }
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

            // Candidates with existing votes must not be transferred.
            // Moving them would make Vote.electionId inconsistent with the candidate's new election.
            const voteCount = await prisma.vote.count({
                where: {
                    candidateId: validCandidateId,
                    electionId: validOriginalElectionId
                }
            });

            if (voteCount > 0) {
                return {
                    success: false,
                    message: 'Kandidat yang sudah memiliki suara tidak dapat dipindahkan ke pemilihan lain'
                };
            }

            // Transfer by updating the election relation instead of deleting and recreating
            // the candidate. This preserves the candidate ID and avoids cascading deletes.
            await prisma.candidate.updateMany({
                where: {
                    id: validCandidateId,
                    electionId: validOriginalElectionId
                },
                data: {
                    electionId: targetElectionId,
                    ...(validData.name !== undefined && { name: validData.name }),
                    ...(validData.viceCandidateName !== undefined && {
                        viceCandidateName: validData.viceCandidateName
                    }),
                    ...(validData.vision !== undefined && { vision: validData.vision }),
                    ...(validData.mission !== undefined && { mission: validData.mission }),
                    ...(validData.photo !== undefined && { photoUrl: validData.photo }),
                    ...(validData.orderNumber !== undefined && {
                        orderNumber: validData.orderNumber
                    }),
                }
            });

            logger.info(
                {
                    from: validOriginalElectionId,
                    to: targetElectionId,
                    candidateId: validCandidateId
                },
                'Candidate transferred'
            );
        } else {
            // Normal update
            const existingCandidate = await prisma.candidate.findFirst({
                where: { id: validCandidateId, electionId: validOriginalElectionId }
            });

            if (!existingCandidate) {
                return { success: false, message: 'Kandidat tidak ditemukan' };
            }

            const updateData: any = {};
            if (validData.name !== undefined) updateData.name = validData.name;
            if (validData.viceCandidateName !== undefined) updateData.viceCandidateName = validData.viceCandidateName;
            if (validData.vision !== undefined) updateData.vision = validData.vision;
            if (validData.mission !== undefined) updateData.mission = validData.mission;
            if (validData.photo !== undefined) updateData.photoUrl = validData.photo;
            if (validData.orderNumber !== undefined) updateData.orderNumber = validData.orderNumber;

            await prisma.candidate.updateMany({
                where: { id: validCandidateId, electionId: validOriginalElectionId },
                data: updateData
            });

            logger.info({ electionId: validOriginalElectionId, candidateId: validCandidateId }, 'Candidate updated');
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

        const electionIdResult = candidateIdSchema.safeParse(electionId);
        const candidateIdResult = candidateIdSchema.safeParse(candidateId);

        if (!electionIdResult.success || !candidateIdResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }

        const validElectionId = electionIdResult.data;
        const validCandidateId = candidateIdResult.data;

        const existingCandidate = await prisma.candidate.findFirst({
            where: { id: validCandidateId, electionId: validElectionId }
        });

        if (!existingCandidate) {
            return { success: false, message: 'Kandidat tidak ditemukan' };
        }

        const voteCount = await prisma.vote.count({
            where: {
                candidateId: validCandidateId,
                electionId: validElectionId
            }
        });

        if (voteCount > 0) {
            return {
                success: false,
                message: 'Kandidat yang sudah memiliki suara tidak dapat dihapus'
            };
        }

        await prisma.candidate.deleteMany({
            where: { id: validCandidateId, electionId: validElectionId }
        });

        logger.info(
            { electionId: validElectionId, candidateId: validCandidateId },
            'Candidate deleted'
        );
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

        const electionIdResult = candidateIdSchema.safeParse(electionId);
        const candidatesResult = z.array(reorderCandidateSchema).min(1).safeParse(candidates);

        if (!electionIdResult.success || !candidatesResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }

        const validElectionId = electionIdResult.data;
        const validCandidates = candidatesResult.data;

        const candidateIds = validCandidates.map((candidate) => candidate.id);
        if (new Set(candidateIds).size !== candidateIds.length) {
            return { success: false, message: 'Data kandidat tidak valid.' };
        }

        // Update each candidate's order based on its position in the submitted array.
        for (let i = 0; i < validCandidates.length; i++) {
            const candidate = validCandidates[i];

            await prisma.candidate.updateMany({
                where: {
                    id: candidate.id,
                    electionId: validElectionId
                },
                data: { orderNumber: i + 1 }
            });
        }

        logger.info(
            { electionId: validElectionId, count: validCandidates.length },
            'Candidates reordered'
        );
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
