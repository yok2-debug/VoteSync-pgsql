import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  handleApiError,
  parseJsonBody,
  verifyAdminSession,
  assertManageableRole,
} from '../lib/api-helpers';

import { z } from 'zod';

const permissionSchema = z.enum([
  'dashboard',
  'elections',
  'candidates',
  'voters',
  'categories',
  'recapitulation',
  'real_count',
  'settings',
  'users',
  'committees',
]);

const ALL_PERMISSIONS = [
  'dashboard',
  'elections',
  'candidates',
  'voters',
  'categories',
  'recapitulation',
  'real_count',
  'settings',
  'users',
  'committees',
] as const;

const roleSchema = z.object({
  isEditing: z.boolean().optional(),
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(3),
  permissions: z.array(permissionSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession('users');
    const json = await parseJsonBody(request);

    // Validate request body with Zod
    const result = roleSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ message: 'Data tidak valid', errors: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;
    const { isEditing, id, name, permissions } = data;

    let roleId = id;

    if (name === 'Super Admin' && roleId !== 'role_super_admin') {
      return NextResponse.json(
        { message: 'Nama peran "Super Admin" hanya dapat digunakan oleh peran Super Admin bawaan.' },
        { status: 403 }
      );
    }

    if (isEditing) {
      if (!roleId) {
        return NextResponse.json({ message: 'ID Peran wajib diisi untuk pengeditan.' }, { status: 400 });
      }

      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
        select: {
          id: true,
          permissions: true,
        },
      });

      if (!existingRole) {
        return NextResponse.json({ message: 'Peran tidak ditemukan.' }, { status: 404 });
      }

      if (roleId === 'role_super_admin') {
        const hasAllPermissions =
          ALL_PERMISSIONS.length === permissions.length &&
          ALL_PERMISSIONS.every((permission) => permissions.includes(permission));

        if (name !== 'Super Admin' || !hasAllPermissions) {
          return NextResponse.json(
            {
              message: 'Peran Super Admin bawaan harus mempertahankan nama dan seluruh hak akses.'
            },
            { status: 403 }
          );
        }
      }

      // Caller must be allowed to manage both the existing role
      // and the new permission set.
      assertManageableRole(session.permissions, existingRole.permissions);
      assertManageableRole(session.permissions, permissions);

      await prisma.$transaction([
        prisma.role.update({
          where: { id: roleId },
          data: { name, permissions }
        }),
        prisma.appUser.updateMany({
          where: { roleId },
          data: {
            sessionVersion: {
              increment: 1,
            },
          },
        }),
      ]);

      return NextResponse.json({ message: 'Peran berhasil diperbarui', id: roleId }, { status: 200 });
    } else {
      // A caller may only create roles whose permissions are
      // a subset of their own permissions.
      assertManageableRole(session.permissions, permissions);

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
  roleId: z.string().trim().min(1),
});

export async function DELETE(request: Request) {
  try {
    const session = await verifyAdminSession('users');
    const json = await parseJsonBody(request);

    const result = deleteRoleSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ message: 'ID Peran wajib diisi', errors: result.error.flatten() }, { status: 400 });
    }

    const { roleId } = result.data;

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        permissions: true,
      },
    });

    if (!role) {
      return NextResponse.json({ message: 'Peran tidak ditemukan.' }, { status: 404 });
    }

    if (role.id === 'role_super_admin' || role.name === 'Super Admin') {
      return NextResponse.json(
        { message: 'Peran "Super Admin" tidak dapat dihapus.' },
        { status: 403 }
      );
    }

    assertManageableRole(session.permissions, role.permissions);

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
