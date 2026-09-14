import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, parseJsonBody, verifyAdminSession } from '../../lib/api-helpers';

import { z } from 'zod';

const settingsSchema = z.object({
  selections: z.record(z.object({
    show: z.boolean(),
    main: z.boolean(),
  })),
}).superRefine((data, ctx) => {
  const mainElections = Object.entries(data.selections)
    .filter(([, settings]) => settings.main);

  for (const [electionId, settings] of Object.entries(data.selections)) {
    if (settings.main && !settings.show) {
      ctx.addIssue({
        code: 'custom',
        path: ['selections', electionId, 'show'],
        message: 'Election utama harus ditampilkan di Real Count.',
      });
    }
  }

  if (mainElections.length > 1) {
    for (const [electionId] of mainElections) {
      ctx.addIssue({
        code: 'custom',
        path: ['selections', electionId, 'main'],
        message: 'Hanya satu election yang dapat menjadi Real Count utama.',
      });
    }
  }
});

export async function POST(request: Request) {
  try {
    await verifyAdminSession('real_count');
    const json = await parseJsonBody(request);

    const result = settingsSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ message: 'Data tidak valid', errors: result.error.flatten() }, { status: 400 });
    }

    const { selections } = result.data;

    const electionIds = Object.keys(selections);

    const elections = await prisma.election.findMany({
      where: { id: { in: electionIds } },
      select: {
        id: true,
        showInRealCount: true,
        isMainInRealCount: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const election of elections) {
        const newSettings = selections[election.id];
        if (newSettings) {
          const updateData: {
            showInRealCount?: boolean;
            isMainInRealCount?: boolean;
          } = {};

          if (newSettings.show !== (election.showInRealCount || false)) {
            updateData.showInRealCount = newSettings.show;
          }
          if (newSettings.main !== (election.isMainInRealCount || false)) {
            updateData.isMainInRealCount = newSettings.main;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.election.update({
              where: { id: election.id },
              data: updateData
            });
          }
        }
      }
    });

    return NextResponse.json({ message: 'Pengaturan Real Count berhasil disimpan' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
