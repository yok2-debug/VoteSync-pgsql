import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { handleApiError, verifyAdminSession } from '../../lib/api-helpers';

export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession('dashboard');
    const { currentPassword, newPassword } = await request.json();

    // Get userId from the validated session
    const userId = session.userId;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Semua field wajib diisi.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Kata sandi baru minimal harus 6 karakter.' }, { status: 400 });
    }

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

    return NextResponse.json({ message: 'Kata sandi berhasil diperbarui.' }, { status: 200 });

  } catch (error) {
    return handleApiError(error);
  }
}
