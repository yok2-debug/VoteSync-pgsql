'use client';
import { useState, useCallback, useEffect } from 'react';
import Loading from '@/app/loading';
import { RoleTable } from './components/role-table';
import { getRoles } from '@/app/actions/roles';
import type { Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const fetchRoles = useCallback(async () => {
    // Only set loading smoothly if it's the first load or if you want explicit loading state
    // For refresh, we might not want to show full loading spinner, but here we do simple way
    if (roles.length === 0) setIsLoading(true);
    try {
      const result = await getRoles();
      if (result.success && result.data) {
        setRoles(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal memuat peran',
          description: result.message
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memuat data peran'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Removed roles dependency to avoid loop, though it wasn't there

  useEffect(() => {
    fetchRoles();
  }, [refreshKey, fetchRoles]);

  const handleRefresh = () => {
    fetchRoles(); // Call directly or trigger effect
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manajemen Peran</h1>
        <p className="text-muted-foreground">
          Buat dan kelola peran pengguna beserta hak aksesnya.
        </p>
      </div>
      {isLoading && roles.length === 0 ? <Loading /> : <RoleTable roles={roles} onRefresh={handleRefresh} />}
    </div>
  );
}
