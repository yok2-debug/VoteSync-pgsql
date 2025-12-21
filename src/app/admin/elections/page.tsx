'use client';
import { useState, useEffect, useCallback } from 'react';
import { ElectionTable } from './components/election-table';
import Loading from '@/app/loading';
import { getElections } from '@/app/actions/elections';
import type { Election } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchElections = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getElections();
      if (result.success && result.data) {
        setElections(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal memuat pemilihan',
          description: result.message
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memuat data pemilihan'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manajemen Pemilihan</h1>
        <p className="text-muted-foreground">
          Buat, lihat, dan kelola semua pemilihan dalam sistem.
        </p>
      </div>
      <ElectionTable elections={elections} refreshElections={fetchElections} />
    </div>
  );
}
