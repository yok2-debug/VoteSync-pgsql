'use client';
import Loading from '@/app/loading';
import { UserTable } from './components/user-table';
import { useEffect, useState, useCallback } from 'react';
import { getAdminUsers } from '@/app/actions/users';
import { getRoles } from '@/app/actions/roles';
import type { AdminUser, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function UsersPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    // Only set loading if it's initial load or we want to block UI
    if (adminUsers.length === 0) setIsLoading(true);
    try {
      const [usersResult, rolesResult] = await Promise.all([
        getAdminUsers(),
        getRoles()
      ]);

      if (usersResult.success && usersResult.data) {
        setAdminUsers(usersResult.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal memuat pengguna',
          description: usersResult.message
        });
      }

      if (rolesResult.success && rolesResult.data) {
        setRoles(rolesResult.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal memuat peran',
          description: rolesResult.message
        });
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memuat data'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Dependencies should be stable

  useEffect(() => {
    fetchData();
  }, [refreshKey, fetchData]);

  const refreshUsers = () => {
    fetchData();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manajemen Pengguna</h1>
        <p className="text-muted-foreground">
          Kelola akun administrator sistem dan tetapkan peran untuk mereka.
        </p>
      </div>
      {isLoading && adminUsers.length === 0 ? <Loading /> : <UserTable users={adminUsers} roles={roles} onRefresh={refreshUsers} />}
    </div>
  );
}
