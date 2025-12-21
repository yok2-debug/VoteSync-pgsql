'use client';
import { RecapitulationDisplay } from './recapitulation-display';
import type { Election, Category } from '@/lib/types';

interface RecapitulationClientPageProps {
  election: Election;
  categories: Category[];
}

export function RecapitulationClientPage({ election, categories }: RecapitulationClientPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rekapitulasi: {election.name}</h1>
        <p className="text-muted-foreground">
          Laporan rinci hasil pemilihan dan partisipasi pemilih.
        </p>
      </div>
      <RecapitulationDisplay
        election={election}
        categories={categories}
      />
    </div>
  );
}
