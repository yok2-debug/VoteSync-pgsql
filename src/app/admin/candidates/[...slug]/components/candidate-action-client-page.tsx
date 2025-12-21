'use client';
import { redirect, useParams } from 'next/navigation';
import Loading from '@/app/loading';
import { CandidateForm } from '../../components/candidate-form';
import { useEffect, useState, useMemo } from 'react';
import { getElections } from '@/app/actions/elections';
import { getCategories } from '@/app/actions/categories';
import type { Election, Candidate, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function CandidateActionClientPage() {
  const params = useParams();
  const [elections, setElections] = useState<Election[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const { slug } = params as { slug: string[] };

  const action = slug ? slug[0] : 'new';
  const isNew = action === 'new';

  const electionId = !isNew ? slug[1] : null;
  const candidateId = !isNew ? slug[2] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [electionsRes, categoriesRes] = await Promise.all([
          getElections(),
          getCategories()
        ]);

        if (electionsRes.success && electionsRes.data) {
          setElections(electionsRes.data);
        }
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
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
    };
    fetchData();
  }, [toast]);


  const election = useMemo(() => {
    if (isLoading || !electionId) return undefined;
    return elections.find(e => e.id === electionId);
  }, [isLoading, electionId, elections]);

  const candidate = useMemo(() => {
    if (isNew || !election || !candidateId) return null;
    const cand = election.candidates?.[candidateId];
    if (!cand) return 'redirect';
    return { ...cand, id: candidateId, voterId: candidateId, electionId: election.id } as Candidate;
  }, [isNew, election, candidateId]);

  if (isLoading) {
    return <Loading />;
  }

  if (!isNew && !election) {
    // If we are editing but the election isn't found, redirect.
    redirect('/admin/candidates');
  }

  if (candidate === 'redirect') {
    redirect(`/admin/candidates`);
  }

  const candidateName = !isNew && candidate ? `"${(candidate as Candidate).name}"` : '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNew ? 'Buat Kandidat Baru' : 'Ubah Kandidat'}
        </h1>
        <p className="text-muted-foreground">
          {isNew ? `Pilih pemilihan dan cari pemilih untuk membuat kandidat baru.` : `Perbarui detail untuk ${candidateName}.`}
        </p>
      </div>
      <CandidateForm
        initialData={candidate as Candidate | null}
        allElections={elections}
        categories={categories}
      />
    </div>
  );
}
