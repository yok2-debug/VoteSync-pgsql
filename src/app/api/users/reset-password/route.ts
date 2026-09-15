import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { revokeAdminSessions } from '@/lib/session';
import {
  handleApiError,
  parseJsonBody,
  verifyAdminSession,
  assertManageableRole,
} from '../../lib/api-helpers';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6),
});
export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession('users');
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
      select: {
        id: true,
        roleId: true,
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (user.id === session.userId) {
      return NextResponse.json(
        { message: 'Gunakan fitur ubah password sendiri untuk akun Anda.' },
        { status: 403 }
      );
    }

    if (user.roleId) {
      const targetRole = await prisma.role.findUnique({
        where: { id: user.roleId },
        select: {
          permissions: true,
        },
      });

      if (!targetRole) {
        return NextResponse.json(
          { message: 'Peran pengguna tidak ditemukan.' },
          { status: 409 }
        );
      }

      assertManageableRole(session.permissions, targetRole.permissions);
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
