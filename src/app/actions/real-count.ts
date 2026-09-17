'use server';

import { prisma } from '@/lib/prisma';
import type { Election, Candidate } from '@/lib/types';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';

export async function getAdminRealCountElections(): Promise<{
    success: boolean;
    data?: Election[];
    message?: string;
}> {
    try {
        await verifyAdminSession('real_count');

        const electionsData = await prisma.election.findMany();

        if (!electionsData || electionsData.length === 0) {
            return { success: true, data: [] };
        }

        const candidatesData = await prisma.candidate.findMany();

        const candidatesByElection: Record<
            string,
            Record<string, Candidate>
        > = {};

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

        const electionIds = electionsData.map((e) => e.id);

        const voteCounts = await prisma.vote.groupBy({
            by: ['electionId', 'candidateId'],
            where: {
                electionId: {
                    in: electionIds,
                },
            },
            _count: {
                _all: true,
            },
        });

        const resultsByElection: Record<
            string,
            Record<string, number>
        > = {};

        voteCounts.forEach((row) => {
            if (!resultsByElection[row.electionId]) {
                resultsByElection[row.electionId] = {};
            }

            resultsByElection[row.electionId][row.candidateId] =
                row._count._all;
        });

        const elections = electionsData.map((e) => ({
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

        return {
            success: true,
            data: elections,
        };
    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn(
                { msg: error.message },
                'Authentication failed fetching admin Real Count'
            );

            return {
                success: false,
                message: error.message,
            };
        }

        logger.error(
            { err: error },
            'Error fetching admin Real Count elections'
        );

        return {
            success: false,
            message: 'Gagal mengambil data Real Count.',
        };
    }
}
