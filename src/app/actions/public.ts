'use server';

import { prisma } from '@/lib/prisma';
import type { Election, Category, Candidate } from '@/lib/types';
import { logger } from '@/lib/logger';

// Publicly accessible elections fetcher
export async function getPublicElections(): Promise<{ success: boolean; data?: Election[]; message?: string }> {
    try {
        // No session check required for public display
        const electionsData = await prisma.election.findMany();

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

        // Fetch vote counts per candidate
        const votesData = await prisma.vote.findMany({
            select: { electionId: true, candidateId: true }
        });

        // Count votes per election and candidate
        const resultsByElection: Record<string, Record<string, number>> = {};
        if (votesData) {
            votesData.forEach((v: { electionId: string; candidateId: string }) => {
                if (!resultsByElection[v.electionId]) {
                    resultsByElection[v.electionId] = {};
                }
                if (!resultsByElection[v.electionId][v.candidateId]) {
                    resultsByElection[v.electionId][v.candidateId] = 0;
                }
                resultsByElection[v.electionId][v.candidateId]++;
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
            results: resultsByElection[e.id] || {},
        })) as Election[];

        return { success: true, data: elections };
    } catch (error) {
        logger.error({ err: error }, 'Error fetching public elections');
        return { success: false, message: 'Gagal mengambil data pemilihan.' };
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
