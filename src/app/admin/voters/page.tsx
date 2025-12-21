'use client';
import { VoterTable } from './components/voter-table';
import Loading from '@/app/loading';
import { useEffect, useState, useCallback } from 'react';
import { getVoters } from '@/app/actions/voters';
import { getCategories } from '@/app/actions/categories';
import { getElections } from '@/app/actions/elections';
import type { Voter, Category, Election } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function VotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [votersResult, categoriesResult, electionsResult] = await Promise.all([
        getVoters({ includeSensitive: true }),
        getCategories(),
        getElections()
      ]);

      if (votersResult.success && votersResult.data) {
        setVoters(votersResult.data);
      }

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }

      if (electionsResult.success && electionsResult.data) {
        setElections(electionsResult.data);
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memuat data.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manajemen Pemilih</h1>
        <p className="text-muted-foreground">
          Tambah, impor, dan kelola semua pemilih dalam sistem.
        </p>
      </div>
      <VoterTable
        voters={voters}
        categories={categories}
        elections={elections}
        refreshVoters={fetchData}
      />
    </div>
  );
}
