import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    handleApiError,
    parseJsonBody,
    verifyAdminSession,
} from '../../lib/api-helpers';
import { acquireRealCountLock } from '@/lib/election-lock';
import { z } from 'zod';

const settingsSchema = z.object({
    mainElectionId: z.string().nullable(),
});

export async function POST(request: Request) {
    try {
        await verifyAdminSession('real_count');
        const json = await parseJsonBody(request);

        const result = settingsSchema.safeParse(json);

        if (!result.success) {
            return NextResponse.json(
                {
                    message: 'Data tidak valid',
                    errors: result.error.flatten(),
                },
                { status: 400 }
            );
        }

        const { mainElectionId } = result.data;

        await prisma.$transaction(async (tx) => {
            await acquireRealCountLock(tx);

            if (mainElectionId) {
                const election = await tx.election.findUnique({
                    where: { id: mainElectionId },
                    select: { id: true },
                });

                if (!election) {
                    throw new Error('INVALID_ELECTION_ID');
                }
            }

            // Selalu reset terlebih dahulu agar election lama
            // tidak tetap menjadi election utama.
            await tx.election.updateMany({
                data: {
                    isMainInRealCount: false,
                },
            });

            // Jika ada election utama yang dipilih,
            // jadikan hanya election tersebut sebagai utama.
            if (mainElectionId) {
                await tx.election.update({
                    where: { id: mainElectionId },
                    data: {
                        isMainInRealCount: true,
                    },
                });
            }
        });

        return NextResponse.json(
            {
                message: 'Pengaturan Real Count berhasil disimpan',
            },
            { status: 200 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
