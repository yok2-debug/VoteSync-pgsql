import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { revokeAdminSessions } from '@/lib/session';
import { handleApiError, parseJsonBody, verifyAdminSession } from '../../lib/api-helpers';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession('dashboard');
    const json = await parseJsonBody(request);
    const result = changePasswordSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Data tidak valid.', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    // Get userId from the validated session
    const userId = session.userId;

    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      return NextResponse.json({ message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const isMatch = await verifyPassword(currentPassword, user.password || '');
    if (!isMatch) {
      return NextResponse.json({ message: 'Password saat ini salah.' }, { status: 400 });
    }

    await prisma.appUser.update({
      where: { id: userId },
      data: { password: await hashPassword(newPassword) }
    });

    await revokeAdminSessions(userId);

    return NextResponse.json({ message: 'Kata sandi berhasil diperbarui.' }, { status: 200 });

  } catch (error) {
    return handleApiError(error);
  }
}
