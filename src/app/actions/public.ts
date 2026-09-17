'use server';

import { prisma } from '@/lib/prisma';
import type { Election, Category, Candidate } from '@/lib/types';
import { logger } from '@/lib/logger';

// Publicly accessible elections fetcher
export async function getPublicElections(): Promise<{ success: boolean; data?: Election[]; message?: string }> {
    try {
        // No session check required for public display
        // Show elections in creation order: oldest first.
        const electionsData = await prisma.election.findMany({
            orderBy: {
                createdAt: 'asc',
            },
        });

        if (!electionsData || electionsData.length === 0) {
            return { success: true, data: [] };
        }

        // Fetch candidates for all elections
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

        const now = new Date();

        // Only aggregate vote counts for elections that have ended.
        // Ongoing elections must never expose their current vote results
        // through this public action.
        const endedElectionIds = electionsData
            .filter((e: { endDate: string | null }) => {
                if (!e.endDate) return false;
                return now >= new Date(e.endDate);
            })
            .map((e: { id: string }) => e.id);

        const voteCounts = endedElectionIds.length > 0
            ? await prisma.vote.groupBy({
                by: ['electionId', 'candidateId'],
                where: {
                    electionId: {
                        in: endedElectionIds,
                    },
                },
                _count: {
                    _all: true,
                },
            })
            : [];

        const resultsByElection: Record<string, Record<string, number>> = {};
        voteCounts.forEach((row) => {
            if (!resultsByElection[row.electionId]) {
                resultsByElection[row.electionId] = {};
            }
            resultsByElection[row.electionId][row.candidateId] =
                row._count._all;
        });

        const endedElectionIdSet = new Set(endedElectionIds);

        const elections = electionsData.map((e: { id: string; name: string; description: string | null; startDate: string | null; endDate: string | null; status: string; useWitnesses: boolean; isMainInRealCount: boolean }) => {
            return {
                id: e.id,
                name: e.name,
                description: e.description || undefined,
                startDate: e.startDate || undefined,
                endDate: e.endDate || undefined,
                status: e.status as 'active' | 'pending',
                useWitnesses: e.useWitnesses || false,
                isMainInRealCount: e.isMainInRealCount || false,
                candidates: candidatesByElection[e.id] || {},
                results: endedElectionIdSet.has(e.id)
                    ? (resultsByElection[e.id] || {})
                    : {},
            };
        }) as Election[];

        return { success: true, data: elections };
    } catch (error) {
        logger.error({ err: error }, 'Error fetching public elections');
        return { success: false, message: 'Gagal mengambil data pemilihan.' };
    }
}

// Public Real Count fetcher.
// Only elections whose endDate has been reached are returned.
// Ongoing or unscheduled elections never have their vote results
// included in this public Real Count data.
export async function getPublicRealCountElections(): Promise<{ success: boolean; data?: Election[]; message?: string }> {
    try {
        const now = new Date();

        // Only ended elections are eligible for public Real Count.
        // Elections without endDate are never considered ended.
        const electionsData = await prisma.election.findMany();

        const endedElections = electionsData.filter((e) => {
            if (!e.endDate) {
                return false;
            }

            return now >= new Date(e.endDate);
        });

        if (endedElections.length === 0) {
            return { success: true, data: [] };
        }

        const endedElectionIds = new Set(
            endedElections.map((e) => e.id)
        );

        const candidatesData = await prisma.candidate.findMany({
            where: {
                electionId: {
                    in: Array.from(endedElectionIds),
                },
            },
        });

        const candidatesByElection: Record<string, Record<string, Candidate>> = {};

        candidatesData.forEach((c) => {
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

        // Only aggregate votes belonging to elections that have ended.
        const voteCounts = await prisma.vote.groupBy({
            by: ['electionId', 'candidateId'],
            where: {
                electionId: {
                    in: Array.from(endedElectionIds),
                },
            },
            _count: {
                _all: true,
            },
        });

        const resultsByElection: Record<string, Record<string, number>> = {};

        voteCounts.forEach((row) => {
            if (!resultsByElection[row.electionId]) {
                resultsByElection[row.electionId] = {};
            }

            resultsByElection[row.electionId][row.candidateId] =
                row._count._all;
        });

        const elections = endedElections.map((e) => ({
            id: e.id,
            name: e.name,
            description: e.description || undefined,
            startDate: e.startDate || undefined,
            endDate: e.endDate || undefined,
            status: e.status as 'active' | 'pending',
            useWitnesses: e.useWitnesses || false,
            isMainInRealCount: e.isMainInRealCount || false,
            candidates: candidatesByElection[e.id] || {},
            results: resultsByElection[e.id] || {},
        })) as Election[];

        return { success: true, data: elections };
    } catch (error) {
        logger.error({ err: error }, 'Error fetching public Real Count elections');
        return {
            success: false,
            message: 'Gagal mengambil data Real Count.',
        };
    }
}

// Publicly accessible categories fetcher
export async function getPublicCategories(): Promise<{ success: boolean; data?: Category[]; message?: string }> {
    try {
        const categoriesData = await prisma.category.findMany();

        if (!categoriesData || categoriesData.length === 0) {
            return { success: true, data: [] };
        }

        const categories = categoriesData.map((c: { id: string; name: string; allowedElections: string[] }) => ({
            id: c.id,
            name: c.name,
            allowedElections: c.allowedElections || [],
        })) as Category[];

        return { success: true, data: categories };
    } catch (error) {
        logger.error({ err: error }, 'Error fetching public categories');
        return { success: false, message: 'Gagal mengambil data kategori.' };
    }
}
