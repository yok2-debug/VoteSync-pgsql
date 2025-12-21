import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { handleApiError, verifyAdminSession } from '../../lib/api-helpers';

export async function POST(request: Request) {
  try {
    await verifyAdminSession('users');
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ message: 'ID Pengguna dan kata sandi baru wajib diisi.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Kata sandi minimal harus 6 karakter.' }, { status: 400 });
    }

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

    return NextResponse.json({ message: 'Kata sandi pengguna berhasil direset.' }, { status: 200 });

  } catch (error) {
    return handleApiError(error);
  }
}
