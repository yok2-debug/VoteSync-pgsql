'use server';

import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/app/api/lib/api-helpers';
import { logger } from '@/lib/logger';
import { getCategories } from './categories';
import type { Category } from '@/lib/types';

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

        // Fetch categories first to determine allowed categories for this election
        const categoriesRes = await getCategories();
        const categories = categoriesRes.data || [];

        const allowedCategoryIds = categories
            .filter((c: Category) => c.allowedElections?.includes(electionId))
            .map((c: Category) => c.id);

        if (allowedCategoryIds.length === 0) {
            return {
                success: true,
                data: {
                    dpt: { total: 0, male: 0, female: 0 },
                    voted: { total: 0, male: 0, female: 0 },
                    notVoted: { total: 0, male: 0, female: 0 }
                }
            };
        }

        // Fetch ONLY gender and hasVoted for voters in allowed categories
        // This prevents pulling heavy fields (like plaintext passwords) and all voters into memory
        const votersData = await prisma.voter.findMany({
            where: { categoryId: { in: allowedCategoryIds } },
            select: { gender: true, hasVoted: true }
        });

        let dpt_male = 0;
        let dpt_female = 0;
        let voted_male = 0;
        let voted_female = 0;

        for (const v of votersData) {
            const isMale = v.gender === 'Laki-laki';
            const isFemale = v.gender === 'Perempuan';
            
            if (isMale) dpt_male++;
            if (isFemale) dpt_female++;

            const hasVotedMap = (v.hasVoted as Record<string, boolean>) || {};
            if (hasVotedMap[electionId] === true) {
                if (isMale) voted_male++;
                if (isFemale) voted_female++;
            }
        }

        const dpt_total = votersData.length;
        const voted_total = voted_male + voted_female;

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
