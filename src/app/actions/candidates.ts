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

        // Calculate and create the candidate inside a serializable transaction.
        // This prevents concurrent creates from observing the same max order
        // number and assigning the same next order number.
        let newOrder = 0;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                newOrder = await prisma.$transaction(async (tx) => {
                    const maxOrderCandidate = await tx.candidate.findFirst({
                        where: { electionId: validElectionId },
                        orderBy: { orderNumber: 'desc' },
                        select: { orderNumber: true }
                    });

                    const nextOrder = (maxOrderCandidate?.orderNumber || 0) + 1;

                    await tx.candidate.create({
                        data: {
                            id: candidateId,
                            electionId: validElectionId,
                            name: validData.name,
                            viceCandidateName: validData.viceCandidateName || null,
                            vision: validData.vision || null,
                            mission: validData.mission || null,
                            photoUrl: validData.photo || null,
                            orderNumber: nextOrder,
                        }
                    });

                    return nextOrder;
                }, {
                    isolationLevel: 'Serializable'
                });

                break;
            } catch (error: any) {
                const isSerializationConflict =
                    error?.code === 'P2034' ||
                    error?.message?.includes('serialization') ||
                    error?.message?.includes('could not serialize');

                if (!isSerializationConflict || attempt === 3) {
                    throw error;
                }

                await new Promise((resolve) =>
                    setTimeout(resolve, 50 * attempt)
                );
            }
        }

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

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await prisma.$transaction(async (tx) => {
                    const candidate = await tx.candidate.findFirst({
                        where: {
                            id: validCandidateId,
                            electionId: validOriginalElectionId
                        }
                    });

                    if (!candidate) {
                        throw new Error(
                            isTransfer
                                ? 'Kandidat asal tidak ditemukan'
                                : 'Kandidat tidak ditemukan'
                        );
                    }

                    if (isTransfer) {
                        const targetElection = await tx.election.findUnique({
                            where: { id: targetElectionId }
                        });

                        if (!targetElection) {
                            throw new Error('Pemilihan tujuan tidak ditemukan');
                        }

                        // The candidate must not have votes before its election
                        // relation is changed. Keeping this check inside the same
                        // serializable transaction prevents a concurrent vote
                        // from racing with the transfer.
                        const voteCount = await tx.vote.count({
                            where: {
                                candidateId: validCandidateId,
                                electionId: validOriginalElectionId
                            }
                        });

                        if (voteCount > 0) {
                            throw new Error(
                                'Kandidat yang sudah memiliki suara tidak dapat dipindahkan ke pemilihan lain'
                            );
                        }

                        await tx.candidate.updateMany({
                            where: {
                                id: validCandidateId,
                                electionId: validOriginalElectionId
                            },
                            data: {
                                electionId: targetElectionId,
                                ...(validData.name !== undefined && {
                                    name: validData.name
                                }),
                                ...(validData.viceCandidateName !== undefined && {
                                    viceCandidateName: validData.viceCandidateName
                                }),
                                ...(validData.vision !== undefined && {
                                    vision: validData.vision
                                }),
                                ...(validData.mission !== undefined && {
                                    mission: validData.mission
                                }),
                                ...(validData.photo !== undefined && {
                                    photoUrl: validData.photo
                                }),
                                ...(validData.orderNumber !== undefined && {
                                    orderNumber: validData.orderNumber
                                }),
                            }
                        });
                    } else {
                        await tx.candidate.updateMany({
                            where: {
                                id: validCandidateId,
                                electionId: validOriginalElectionId
                            },
                            data: {
                                ...(validData.name !== undefined && {
                                    name: validData.name
                                }),
                                ...(validData.viceCandidateName !== undefined && {
                                    viceCandidateName: validData.viceCandidateName
                                }),
                                ...(validData.vision !== undefined && {
                                    vision: validData.vision
                                }),
                                ...(validData.mission !== undefined && {
                                    mission: validData.mission
                                }),
                                ...(validData.photo !== undefined && {
                                    photoUrl: validData.photo
                                }),
                                ...(validData.orderNumber !== undefined && {
                                    orderNumber: validData.orderNumber
                                }),
                            }
                        });
                    }
                }, {
                    isolationLevel: 'Serializable'
                });

                break;
            } catch (error: any) {
                const isSerializationConflict =
                    error?.code === 'P2034' ||
                    error?.message?.includes('serialization') ||
                    error?.message?.includes('could not serialize');

                if (!isSerializationConflict || attempt === 3) {
                    throw error;
                }

                await new Promise((resolve) =>
                    setTimeout(resolve, 50 * attempt)
                );
            }
        }

        logger.info(
            {
                from: validOriginalElectionId,
                to: isTransfer ? targetElectionId : validOriginalElectionId,
                candidateId: validCandidateId
            },
            isTransfer ? 'Candidate transferred' : 'Candidate updated'
        );

        revalidatePath('/admin/candidates');
        return { success: true, message: 'Kandidat berhasil diperbarui' };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message }, 'Authentication failed updating candidate');
            return { success: false, message: error.message };
        }

        logger.error({ err: error }, 'Error updating candidate');

        const knownMessages = [
            'Kandidat asal tidak ditemukan',
            'Kandidat tidak ditemukan',
            'Pemilihan tujuan tidak ditemukan',
            'Kandidat yang sudah memiliki suara tidak dapat dipindahkan ke pemilihan lain'
        ];

        if (knownMessages.includes(error?.message)) {
            return { success: false, message: error.message };
        }

        return {
            success: false,
            message: error.message || 'Gagal memperbarui kandidat'
        };
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

        // The submitted list must contain exactly all candidates belonging
        // to this election. This prevents partial reorders from leaving
        // stale order numbers on omitted candidates.
        const electionCandidates = await prisma.candidate.findMany({
            where: { electionId: validElectionId },
            select: { id: true }
        });

        if (electionCandidates.length !== validCandidates.length) {
            return {
                success: false,
                message: 'Daftar kandidat tidak lengkap.'
            };
        }

        const electionCandidateIds = new Set(
            electionCandidates.map((candidate) => candidate.id)
        );

        if (candidateIds.some((id) => !electionCandidateIds.has(id))) {
            return {
                success: false,
                message: 'Kandidat tidak sesuai dengan pemilihan.'
            };
        }

        await prisma.$transaction(
            validCandidates.map((candidate, index) =>
                prisma.candidate.updateMany({
                    where: {
                        id: candidate.id,
                        electionId: validElectionId
                    },
                    data: { orderNumber: index + 1 }
                })
            )
        );

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
