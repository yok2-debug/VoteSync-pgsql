import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { handleApiError, verifyAdminSession } from '../lib/api-helpers';

import { z } from 'zod';

async function checkUsernameExists(username: string, userIdToExclude?: string): Promise<boolean> {
  const users = await prisma.appUser.findMany({
    where: { username },
    select: { id: true, username: true }
  });

  for (const user of users) {
    if (user.id !== userIdToExclude && user.username === username) {
      return true;
    }
  }
  return false;
}

const userSchema = z.object({
  isEditing: z.boolean().optional(),
  id: z.string().optional(),
  username: z.string().min(3),
  password: z.string().optional(),
  roleId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await verifyAdminSession('users');
    const json = await request.json();

    // Validate request body with Zod
    const result = userSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ message: 'Data tidak valid', errors: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;
    const { isEditing, id, username, password, roleId } = data;

    let userId = id;

    if (isEditing) {
      if (!userId) {
        return NextResponse.json({ message: 'ID Pengguna wajib diisi untuk pengeditan.' }, { status: 400 });
      }

      const isUsernameTaken = await checkUsernameExists(username, userId);
      if (isUsernameTaken) {
        return NextResponse.json({ message: `Username "${username}" sudah digunakan.` }, { status: 409 });
      }

      const existingUser = await prisma.appUser.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        return NextResponse.json({ message: 'Pengguna tidak ditemukan.' }, { status: 404 });
      }

      const updateData: any = {
        username,
        roleId,
      };

      if (password) {
        updateData.password = await hashPassword(password);
      }

      await prisma.appUser.update({
        where: { id: userId },
        data: updateData
      });

      return NextResponse.json({ message: 'Pengguna berhasil diperbarui', id: userId }, { status: 200 });

    } else {
      const isUsernameTaken = await checkUsernameExists(username);
      if (isUsernameTaken) {
        return NextResponse.json({ message: `Username "${username}" sudah digunakan.` }, { status: 409 });
      }

      const newUserId = `user-${Date.now()}`;
      await prisma.appUser.create({
        data: {
          id: newUserId,
          username,
          roleId,
          password: await hashPassword(password || Math.random().toString(36).slice(-8)),
        }
      });

      return NextResponse.json({ message: 'Pengguna berhasil dibuat', id: newUserId }, { status: 201 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

const deleteUserSchema = z.object({
  userId: z.string().min(1),
});

export async function DELETE(request: Request) {
  try {
    await verifyAdminSession('users');
    const json = await request.json();

    const result = deleteUserSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ message: 'ID Pengguna wajib diisi', errors: result.error.flatten() }, { status: 400 });
    }

    const { userId } = result.data;

    // Check if trying to delete admin user
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (user && user.username === 'admin') {
      return NextResponse.json({ message: 'Pengguna "admin" tidak dapat dihapus.' }, { status: 403 });
    }

    await prisma.appUser.delete({
      where: { id: userId }
    });

    return NextResponse.json({ message: 'Pengguna berhasil dihapus' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
