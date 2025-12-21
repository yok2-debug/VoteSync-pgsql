import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Election } from '@/lib/types';
import { handleApiError, verifyAdminSession } from '../../lib/api-helpers';

import { z } from 'zod';

const settingsSchema = z.object({
  selections: z.record(z.object({
    show: z.boolean(),
    main: z.boolean(),
  })),
  originalElections: z.array(z.custom<Election>()),
});

export async function POST(request: Request) {
  try {
    await verifyAdminSession('real_count');
    const json = await request.json();

    const result = settingsSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ message: 'Data tidak valid', errors: result.error.flatten() }, { status: 400 });
    }

    const { selections, originalElections } = result.data;

    for (const election of originalElections) {
      const newSettings = selections[election.id];
      if (newSettings) {
        const updateData: any = {};

        if (newSettings.show !== (election.showInRealCount || false)) {
          updateData.showInRealCount = newSettings.show;
        }
        if (newSettings.main !== (election.isMainInRealCount || false)) {
          updateData.isMainInRealCount = newSettings.main;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.election.update({
            where: { id: election.id },
            data: updateData
          });
        }
      }
    }

    return NextResponse.json({ message: 'Pengaturan Real Count berhasil disimpan' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
