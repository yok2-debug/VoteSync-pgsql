'use server';

import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';
import { getCategories } from './categories';
import type { Voter, Category } from '@/lib/types';

export interface RecapitulationStats {
    dpt: { total: number; male: number; female: number };
    voted: { total: number; male: number; female: number };
    notVoted: { total: number; male: number; female: number };
}

export async function getRecapitulationStats(electionId: string): Promise<{ success: boolean; data?: RecapitulationStats; message?: string }> {
    try {
        // Check for 'recapitulation' permission, but fall back to 'voters' if needed
        try {
            await verifyAdminSession('recapitulation');
        } catch {
            await verifyAdminSession('voters');
        }

        const [votersData, categoriesRes] = await Promise.all([
            prisma.voter.findMany(),
            getCategories()
        ]);

        if (!votersData || votersData.length === 0) {
            return {
                success: true,
                data: {
                    dpt: { total: 0, male: 0, female: 0 },
                    voted: { total: 0, male: 0, female: 0 },
                    notVoted: { total: 0, male: 0, female: 0 }
                }
            };
        }

        const voterList = votersData.map((v: { id: string; name: string; categoryId: string | null; gender: string | null; hasVoted: unknown }) => ({
            id: v.id,
            name: v.name,
            category: v.categoryId || '',
            gender: v.gender as 'Laki-laki' | 'Perempuan' | undefined,
            hasVoted: (v.hasVoted as Record<string, boolean>) || {},
        })) as Voter[];

        const categories = categoriesRes.data || [];

        // Filter voters allowed for this election
        const allowedCategoryIds = new Set(
            categories.filter(c => c.allowedElections?.includes(electionId)).map(c => c.id)
        );
        const votersForThisElection = voterList.filter(v => allowedCategoryIds.has(v.category));

        // Calculate Stats
        const dpt_male = votersForThisElection.filter(v => v.gender === 'Laki-laki').length;
        const dpt_female = votersForThisElection.filter(v => v.gender === 'Perempuan').length;
        const dpt_total = votersForThisElection.length;

        const votersWhoVoted = votersForThisElection.filter(v => v.hasVoted?.[electionId] === true);
        const voted_male = votersWhoVoted.filter(v => v.gender === 'Laki-laki').length;
        const voted_female = votersWhoVoted.filter(v => v.gender === 'Perempuan').length;
        const voted_total = votersWhoVoted.length;

        const notVoted_male = dpt_male - voted_male;
        const notVoted_female = dpt_female - voted_female;
        const notVoted_total = dpt_total - voted_total;

        return {
            success: true,
            data: {
                dpt: { total: dpt_total, male: dpt_male, female: dpt_female },
                voted: { total: voted_total, male: voted_male, female: voted_female },
                notVoted: { total: notVoted_total, male: notVoted_male, female: notVoted_female },
            }
        };

    } catch (error: any) {
        if (error.name === 'AuthError') {
            logger.warn({ msg: error.message, electionId }, 'Authentication failed fetching recapitulation stats');
            return { success: false, message: error.message };
        }
        logger.error({ err: error, electionId }, 'Error calculating recapitulation stats');
        return { success: false, message: 'Gagal menghitung statistik rekapitulasi.' };
    }
}
