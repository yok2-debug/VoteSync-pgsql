'use server';

import { prisma } from '@/lib/prisma';
import type { AdminUser, Role, Permission } from '@/lib/types';


export async function initializeDefaultAdmin(): Promise<void> {
  try {
    const existingRole = await prisma.role.findUnique({
      where: { id: 'role_super_admin' }
    });

    const allPermissions: Permission[] = [
      'dashboard',
      'elections',
      'candidates',
      'voters',
      'categories',
      'recapitulation',
      'real_count',
      'users',
      'committees',
    ];

    if (existingRole) {
      const hasAllPermissions =
        allPermissions.length === existingRole.permissions.length &&
        allPermissions.every((permission) => existingRole.permissions.includes(permission));

      if (
        existingRole.name !== 'Super Admin' ||
        !hasAllPermissions
      ) {
        await prisma.role.update({
          where: { id: 'role_super_admin' },
          data: {
            name: 'Super Admin',
            permissions: allPermissions,
          },
        });
      }
    } else {
      await prisma.role.create({
        data: {
          id: 'role_super_admin',
          name: 'Super Admin',
          permissions: allPermissions,
        },
      });
    }
  } catch (error) {
    // Fail silently in production
  }
}


export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const users = await prisma.appUser.findMany();

    if (!users) {
      return [];
    }

    return users.map((u: { id: string; username: string; password: string; roleId: string | null }) => ({
      id: u.id,
      username: u.username,
      password: u.password,
      roleId: u.roleId || '',
    }));
  } catch (error) {
    return [];
  }
}

export async function getRoles(): Promise<Role[]> {
  try {
    const roles = await prisma.role.findMany();

    if (!roles) {
      return [];
    }

    return roles.map((r: { id: string; name: string; permissions: string[] }) => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions as Permission[],
    }));
  } catch (error) {
    return [];
  }
}
