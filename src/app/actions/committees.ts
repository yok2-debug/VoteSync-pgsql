'use server';

import { prisma } from '@/lib/prisma';
import type { Committee, CommitteeMember } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { acquireCommitteeOperationLock } from '@/lib/election-lock';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const committeeIdSchema = z.string().min(1);

const committeeMemberSchema = z.object({
    name: z.string().trim().min(1),
    role: z.enum(['Ketua', 'Anggota']),
});

const committeeMemberUpdateSchema = committeeMemberSchema.partial();

const committeeMemberWithIdSchema = committeeMemberSchema.extend({
    id: z.string().min(1),
});

const committeeSchema = z.object({
    name: z.string().trim().min(1),
    electionIds: z.array(z.string().min(1)),
    members: z.array(committeeMemberWithIdSchema),
});

const committeeUpdateSchema = committeeSchema.partial();

// Helper to safely parse members from JSON
function parseMembers(members: unknown): CommitteeMember[] {
    const result = z.array(committeeMemberWithIdSchema).safeParse(members);
    return result.success ? result.data : [];
}

// Committee CRUD
export async function getCommittees(): Promise<{ success: boolean; data?: Committee[]; message?: string }> {
    try {
        await verifyAdminSession('committees');

        const committeesData = await prisma.committee.findMany();

        if (!committeesData || committeesData.length === 0) {
            return { success: true, data: [] };
        }

        const committees = committeesData.map((c: { id: string; name: string; electionIds: string[]; members: unknown; createdAt: Date; updatedAt: Date }) => ({
            id: c.id,
            name: c.name,
            electionIds: c.electionIds || [],
            members: parseMembers(c.members),
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        })) as Committee[];

        return { success: true, data: committees };
    } catch (error) {
        logger.error({ err: error }, 'Error fetching committees');
        return { success: false, message: 'Gagal mengambil data panitia.' };
    }
}

export async function getCommittee(id: string): Promise<{ success: boolean; data?: Committee; message?: string }> {
    try {
        await verifyAdminSession('committees');

        const idResult = committeeIdSchema.safeParse(id);
        if (!idResult.success) return { success: false, message: 'Data tidak valid.' };
        const validId = idResult.data;

        const committee = await prisma.committee.findUnique({
            where: { id: validId }
        });

        if (!committee) {
            return { success: false, message: 'Panitia tidak ditemukan.' };
        }

        const mappedCommittee: Committee = {
            id: committee.id,
            name: committee.name,
            electionIds: committee.electionIds || [],
            members: parseMembers(committee.members),
            createdAt: committee.createdAt.toISOString(),
            updatedAt: committee.updatedAt.toISOString(),
        };

        return { success: true, data: mappedCommittee };
    } catch (error) {
        logger.error({ err: error }, 'Error fetching committee');
        return { success: false, message: 'Gagal mengambil data panitia.' };
    }
}

export async function createCommittee(
    data: Omit<Committee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; message?: string; data?: Committee }> {
    try {
        await verifyAdminSession('committees');

        const dataResult = committeeSchema.safeParse(data);
        if (!dataResult.success) return { success: false, message: 'Data tidak valid.' };
        const validData = dataResult.data;

        const committeeId = `committee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const created = await prisma.$transaction(async (tx) => {
            await acquireCommitteeOperationLock(tx);

            return tx.committee.create({
                data: {
                    id: committeeId,
                    name: validData.name,
                    electionIds: validData.electionIds,
                    members: validData.members as unknown as any,
                }
            });
        });

        const newCommittee: Committee = {
            id: created.id,
            name: created.name,
            electionIds: created.electionIds || [],
            members: parseMembers(created.members),
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        };

        logger.info({ committeeId }, 'Committee created');
        return { success: true, data: newCommittee, message: 'Kategori panitia berhasil dibuat.' };
    } catch (error) {
        logger.error({ err: error }, 'Error creating committee');
        return { success: false, message: 'Gagal membuat kategori panitia.' };
    }
}

export async function updateCommittee(
    id: string,
    data: Partial<Omit<Committee, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('committees');

        const idResult = committeeIdSchema.safeParse(id);
        const dataResult = committeeUpdateSchema.safeParse(data);
        if (!idResult.success || !dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validId = idResult.data;
        const validData = dataResult.data;

        const updated = await prisma.$transaction(async (tx) => {
            await acquireCommitteeOperationLock(tx);

            const existing = await tx.committee.findUnique({
                where: { id: validId }
            });

            if (!existing) {
                return false;
            }

            const updateData: any = {};
            if (validData.name !== undefined) updateData.name = validData.name;
            if (validData.electionIds !== undefined) updateData.electionIds = validData.electionIds;
            if (validData.members !== undefined) updateData.members = validData.members as unknown as any;

            await tx.committee.update({
                where: { id: validId },
                data: updateData
            });

            return true;
        });

        if (!updated) {
            return { success: false, message: 'Panitia tidak ditemukan.' };
        }

        logger.info({ committeeId: validId }, 'Committee updated');
        return { success: true, message: 'Kategori panitia berhasil diperbarui.' };
    } catch (error) {
        logger.error({ err: error }, 'Error updating committee');
        return { success: false, message: 'Gagal memperbarui kategori panitia.' };
    }
}

export async function deleteCommittee(id: string): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('committees');

        const idResult = committeeIdSchema.safeParse(id);
        if (!idResult.success) return { success: false, message: 'Data tidak valid.' };
        const validId = idResult.data;

        const deleted = await prisma.$transaction(async (tx) => {
            await acquireCommitteeOperationLock(tx);

            const existing = await tx.committee.findUnique({
                where: { id: validId }
            });

            if (!existing) {
                return false;
            }

            await tx.committee.delete({
                where: { id: validId }
            });

            return true;
        });

        if (!deleted) {
            return { success: false, message: 'Panitia tidak ditemukan.' };
        }

        logger.info({ committeeId: validId }, 'Committee deleted');
        return { success: true, message: 'Kategori panitia berhasil dihapus.' };
    } catch (error) {
        logger.error({ err: error }, 'Error deleting committee');
        return { success: false, message: 'Gagal menghapus kategori panitia.' };
    }
}

// Member CRUD within committee
export async function addMemberToCommittee(
    committeeId: string,
    member: Omit<CommitteeMember, 'id'>
): Promise<{ success: boolean; message?: string; data?: CommitteeMember }> {
    try {
        await verifyAdminSession('committees');

        const committeeIdResult = committeeIdSchema.safeParse(committeeId);
        const memberResult = committeeMemberSchema.safeParse(member);
        if (!committeeIdResult.success || !memberResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validCommitteeId = committeeIdResult.data;
        const validMember = memberResult.data;

        const newMember = await prisma.$transaction(async (tx) => {
            await acquireCommitteeOperationLock(tx);

            const committee = await tx.committee.findUnique({
                where: { id: validCommitteeId }
            });

            if (!committee) {
                return null;
            }

            const members = parseMembers(committee.members);
            const memberId = `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const memberToAdd: CommitteeMember = {
                id: memberId,
                ...validMember,
            };

            members.push(memberToAdd);

            await tx.committee.update({
                where: { id: validCommitteeId },
                data: { members: members as unknown as any }
            });

            return memberToAdd;
        });

        if (!newMember) {
            return { success: false, message: 'Kategori panitia tidak ditemukan.' };
        }

        const memberId = newMember.id;

        logger.info({ committeeId: validCommitteeId, memberId }, 'Member added to committee');
        return { success: true, data: newMember, message: 'Anggota panitia berhasil ditambahkan.' };
    } catch (error) {
        logger.error({ err: error }, 'Error adding member to committee');
        return { success: false, message: 'Gagal menambahkan anggota panitia.' };
    }
}

export async function updateCommitteeMember(
    committeeId: string,
    memberId: string,
    data: Partial<Omit<CommitteeMember, 'id'>>
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('committees');

        const committeeIdResult = committeeIdSchema.safeParse(committeeId);
        const memberIdResult = committeeIdSchema.safeParse(memberId);
        const dataResult = committeeMemberUpdateSchema.safeParse(data);
        if (!committeeIdResult.success || !memberIdResult.success || !dataResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validCommitteeId = committeeIdResult.data;
        const validMemberId = memberIdResult.data;
        const validData = dataResult.data;

        const result = await prisma.$transaction(async (tx) => {
            await acquireCommitteeOperationLock(tx);

            const committee = await tx.committee.findUnique({
                where: { id: validCommitteeId }
            });

            if (!committee) {
                return 'committee_not_found' as const;
            }

            const members = parseMembers(committee.members);
            const memberIndex = members.findIndex((m) => m.id === validMemberId);

            if (memberIndex === -1) {
                return 'member_not_found' as const;
            }

            members[memberIndex] = {
                ...members[memberIndex],
                ...validData,
            };

            await tx.committee.update({
                where: { id: validCommitteeId },
                data: { members: members as unknown as any }
            });

            return 'updated' as const;
        });

        if (result === 'committee_not_found') {
            return { success: false, message: 'Kategori panitia tidak ditemukan.' };
        }

        if (result === 'member_not_found') {
            return { success: false, message: 'Anggota panitia tidak ditemukan.' };
        }

        logger.info({ committeeId: validCommitteeId, memberId: validMemberId }, 'Committee member updated');
        return { success: true, message: 'Anggota panitia berhasil diperbarui.' };
    } catch (error) {
        logger.error({ err: error }, 'Error updating committee member');
        return { success: false, message: 'Gagal memperbarui anggota panitia.' };
    }
}

export async function deleteMemberFromCommittee(
    committeeId: string,
    memberId: string
): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('committees');

        const committeeIdResult = committeeIdSchema.safeParse(committeeId);
        const memberIdResult = committeeIdSchema.safeParse(memberId);
        if (!committeeIdResult.success || !memberIdResult.success) {
            return { success: false, message: 'Data tidak valid.' };
        }
        const validCommitteeId = committeeIdResult.data;
        const validMemberId = memberIdResult.data;

        const result = await prisma.$transaction(async (tx) => {
            await acquireCommitteeOperationLock(tx);

            const committee = await tx.committee.findUnique({
                where: { id: validCommitteeId }
            });

            if (!committee) {
                return 'committee_not_found' as const;
            }

            const members = parseMembers(committee.members);
            const updatedMembers = members.filter((m) => m.id !== validMemberId);

            if (updatedMembers.length === members.length) {
                return 'member_not_found' as const;
            }

            await tx.committee.update({
                where: { id: validCommitteeId },
                data: { members: updatedMembers as unknown as any }
            });

            return 'deleted' as const;
        });

        if (result === 'committee_not_found') {
            return { success: false, message: 'Kategori panitia tidak ditemukan.' };
        }

        if (result === 'member_not_found') {
            return { success: false, message: 'Anggota panitia tidak ditemukan.' };
        }

        logger.info({ committeeId: validCommitteeId, memberId: validMemberId }, 'Member deleted from committee');
        return { success: true, message: 'Anggota panitia berhasil dihapus.' };
    } catch (error) {
        logger.error({ err: error }, 'Error deleting member from committee');
        return { success: false, message: 'Gagal menghapus anggota panitia.' };
    }
}

// Helper to get committees for a specific election
export async function getCommitteesForElection(
    electionId: string
): Promise<{ success: boolean; data?: Committee[]; message?: string }> {
    try {
        // Allow access if user has 'committees' OR 'recapitulation' permission
        try {
            await verifyAdminSession('committees');
        } catch {
            await verifyAdminSession('recapitulation');
        }

        const electionIdResult = committeeIdSchema.safeParse(electionId);
        if (!electionIdResult.success) return { success: false, message: 'Data tidak valid.' };
        const validElectionId = electionIdResult.data;

        const committeesData = await prisma.committee.findMany();

        if (!committeesData || committeesData.length === 0) {
            return { success: true, data: [] };
        }

        const linkedCommittees = committeesData
            .filter((c: { id: string; name: string; electionIds: string[]; members: unknown; createdAt: Date; updatedAt: Date }) => c.electionIds && c.electionIds.includes(validElectionId))
            .map((c: { id: string; name: string; electionIds: string[]; members: unknown; createdAt: Date; updatedAt: Date }) => ({
                id: c.id,
                name: c.name,
                electionIds: c.electionIds || [],
                members: parseMembers(c.members),
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
            })) as Committee[];

        return { success: true, data: linkedCommittees };
    } catch (error) {
        logger.error({ err: error }, 'Error getting committees for election');
        return { success: false, message: 'Gagal mengambil data panitia untuk pemilihan.' };
    }
}
