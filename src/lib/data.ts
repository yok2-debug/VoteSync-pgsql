'use server';

import { prisma } from '@/lib/prisma';
import type { AdminUser, Role, Permission } from '@/lib/types';
import { hashPassword } from '@/lib/password';


export async function initializeDefaultAdmin(): Promise<void> {
  try {
    // 1. Check for Super Admin role
    const existingRole = await prisma.role.findFirst({
      where: { name: 'Super Admin' }
    });

    let superAdminRoleId: string | null = null;

    if (existingRole) {
      superAdminRoleId = existingRole.id;
    } else {
      // Create Super Admin role if it doesn't exist
      const allPermissions: Permission[] = ['dashboard', 'elections', 'candidates', 'voters', 'categories', 'recapitulation', 'real_count', 'settings', 'users', 'committees'];
      const newRoleId = 'role-super-admin';

      await prisma.role.create({
        data: {
          id: newRoleId,
          name: 'Super Admin',
          permissions: allPermissions
        }
      });

      superAdminRoleId = newRoleId;
    }

    // 2. Check if 'admin' user exists
    const existingAdmin = await prisma.appUser.findFirst({
      where: { username: 'admin' }
    });

    // 3. If 'admin' user doesn't exist, create it
    if (!existingAdmin && superAdminRoleId) {
      await prisma.appUser.create({
        data: {
          id: 'user-admin',
          username: 'admin',
          password: await hashPassword('admin'),
          roleId: superAdminRoleId
        }
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
