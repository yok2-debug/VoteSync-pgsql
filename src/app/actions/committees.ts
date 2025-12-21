'use server';

import { prisma } from '@/lib/prisma';
import type { Committee, CommitteeMember } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';

// Helper to safely parse members from JSON
function parseMembers(members: unknown): CommitteeMember[] {
    if (!members || !Array.isArray(members)) return [];
    return members as CommitteeMember[];
}

// Committee CRUD
export async function getCommittees(): Promise<{ success: boolean; data?: Committee[]; message?: string }> {
    try {
        await verifyAdminSession('committees');

        const committeesData = await prisma.committee.findMany();

        if (!committeesData || committeesData.length === 0) {
            return { success: true, data: [] };
        }

        const committees = committeesData.map((c) => ({
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

        const committee = await prisma.committee.findUnique({
            where: { id }
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

        const committeeId = `committee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const created = await prisma.committee.create({
            data: {
                id: committeeId,
                name: data.name,
                electionIds: data.electionIds || [],
                members: (data.members || []) as unknown as any,
            }
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

        const existing = await prisma.committee.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, message: 'Panitia tidak ditemukan.' };
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.electionIds !== undefined) updateData.electionIds = data.electionIds;
        if (data.members !== undefined) updateData.members = data.members as unknown as any;

        await prisma.committee.update({
            where: { id },
            data: updateData
        });

        logger.info({ committeeId: id }, 'Committee updated');
        return { success: true, message: 'Kategori panitia berhasil diperbarui.' };
    } catch (error) {
        logger.error({ err: error }, 'Error updating committee');
        return { success: false, message: 'Gagal memperbarui kategori panitia.' };
    }
}

export async function deleteCommittee(id: string): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdminSession('committees');

        const existing = await prisma.committee.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, message: 'Panitia tidak ditemukan.' };
        }

        await prisma.committee.delete({
            where: { id }
        });

        logger.info({ committeeId: id }, 'Committee deleted');
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

        const committee = await prisma.committee.findUnique({
            where: { id: committeeId }
        });

        if (!committee) {
            return { success: false, message: 'Kategori panitia tidak ditemukan.' };
        }

        const members = parseMembers(committee.members);
        const memberId = `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newMember: CommitteeMember = {
            id: memberId,
            ...member,
        };

        members.push(newMember);

        await prisma.committee.update({
            where: { id: committeeId },
            data: { members: members as unknown as any }
        });

        logger.info({ committeeId, memberId }, 'Member added to committee');
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

        const committee = await prisma.committee.findUnique({
            where: { id: committeeId }
        });

        if (!committee) {
            return { success: false, message: 'Kategori panitia tidak ditemukan.' };
        }

        const members = parseMembers(committee.members);
        const memberIndex = members.findIndex((m) => m.id === memberId);

        if (memberIndex === -1) {
            return { success: false, message: 'Anggota panitia tidak ditemukan.' };
        }

        members[memberIndex] = {
            ...members[memberIndex],
            ...data,
        };

        await prisma.committee.update({
            where: { id: committeeId },
            data: { members: members as unknown as any }
        });

        logger.info({ committeeId, memberId }, 'Committee member updated');
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

        const committee = await prisma.committee.findUnique({
            where: { id: committeeId }
        });

        if (!committee) {
            return { success: false, message: 'Kategori panitia tidak ditemukan.' };
        }

        const members = parseMembers(committee.members);
        const updatedMembers = members.filter((m) => m.id !== memberId);

        if (updatedMembers.length === members.length) {
            return { success: false, message: 'Anggota panitia tidak ditemukan.' };
        }

        await prisma.committee.update({
            where: { id: committeeId },
            data: { members: updatedMembers as unknown as any }
        });

        logger.info({ committeeId, memberId }, 'Member deleted from committee');
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

        const committeesData = await prisma.committee.findMany();

        if (!committeesData || committeesData.length === 0) {
            return { success: true, data: [] };
        }

        const linkedCommittees = committeesData
            .filter((c) => c.electionIds && c.electionIds.includes(electionId))
            .map((c) => ({
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
