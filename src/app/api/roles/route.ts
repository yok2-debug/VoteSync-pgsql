import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, verifyAdminSession } from '../lib/api-helpers';

import { z } from 'zod';

const roleSchema = z.object({
  isEditing: z.boolean().optional(),
  id: z.string().optional(),
  name: z.string().min(3),
  permissions: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  try {
    await verifyAdminSession('users');
    const json = await request.json();

    // Validate request body with Zod
    const result = roleSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ message: 'Data tidak valid', errors: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;
    const { isEditing, id, name, permissions } = data;

    let roleId = id;

    if (isEditing) {
      if (!roleId) {
        return NextResponse.json({ message: 'ID Peran wajib diisi untuk pengeditan.' }, { status: 400 });
      }

      await prisma.role.update({
        where: { id: roleId },
        data: { name, permissions }
      });

      return NextResponse.json({ message: 'Peran berhasil diperbarui', id: roleId }, { status: 200 });
    } else {
      const newRoleId = `role-${Date.now()}`;
      await prisma.role.create({
        data: { id: newRoleId, name, permissions }
      });

      return NextResponse.json({ message: 'Peran berhasil dibuat', id: newRoleId }, { status: 201 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

const deleteRoleSchema = z.object({
  roleId: z.string().min(1),
});

export async function DELETE(request: Request) {
  try {
    await verifyAdminSession('users');
    const json = await request.json();

    const result = deleteRoleSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ message: 'ID Peran wajib diisi', errors: result.error.flatten() }, { status: 400 });
    }

    const { roleId } = result.data;

    // Check if role is in use
    const users = await prisma.appUser.findMany({
      where: { roleId },
      select: { id: true }
    });

    if (users && users.length > 0) {
      return NextResponse.json({ message: 'Peran tidak dapat dihapus karena masih digunakan oleh pengguna.' }, { status: 409 });
    }

    await prisma.role.delete({
      where: { id: roleId }
    });

    return NextResponse.json({ message: 'Peran berhasil dihapus' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
