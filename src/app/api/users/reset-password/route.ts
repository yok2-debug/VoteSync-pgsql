import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { revokeAdminSessions } from '@/lib/session';
import { handleApiError, parseJsonBody, verifyAdminSession } from '../../lib/api-helpers';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6),
});
export async function POST(request: Request) {
  try {
    await verifyAdminSession('users');
    const json = await parseJsonBody(request);
    const result = resetPasswordSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Data tidak valid.', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, newPassword } = result.data;

    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    await prisma.appUser.update({
      where: { id: userId },
      data: { password: await hashPassword(newPassword) }
    });

    await revokeAdminSessions(userId);

    return NextResponse.json({ message: 'Kata sandi pengguna berhasil direset.' }, { status: 200 });

  } catch (error) {
    return handleApiError(error);
  }
}
