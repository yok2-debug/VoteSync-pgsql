'use client';
import { ElectionForm } from '../../components/election-form';
import { redirect, useParams } from 'next/navigation';
import Loading from '@/app/loading';
import { useEffect, useState } from 'react';
import { getElection } from '@/app/actions/elections';
import type { Election } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function ElectionActionClientPage() {
  const { electionId } = useParams() as { electionId: string };
  const [election, setElection] = useState<Election | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchElection = async () => {
      if (electionId === 'new') {
        setElection({
          id: 'new',
          name: '',
          description: '',
          status: 'pending',
          candidates: {},
          committee: [],
          startDate: undefined,
          endDate: undefined,
        } as unknown as Election);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getElection(electionId);
        if (result.success && result.data) {
          setElection(result.data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message || 'Pemilihan tidak ditemukan.'
          });
          // Delay redirect slightly or just return, useEffect cannot break render directly
          // but we can set state to trigger redirect in render or use router.push
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Gagal memuat data pemilihan.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchElection();
  }, [electionId, toast]);

  if (isLoading) {
    return <Loading />;
  }

  const isNew = electionId === 'new';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isNew ? 'Buat Pemilihan Baru' : 'Ubah Pemilihan'}</h1>
        <p className="text-muted-foreground">
          {isNew ? 'Isi detail untuk pemilihan baru.' : `Kelola detail untuk "${election?.name}".`}
        </p>
      </div>
      {election && <ElectionForm election={election} />}
    </div>
  );
}
