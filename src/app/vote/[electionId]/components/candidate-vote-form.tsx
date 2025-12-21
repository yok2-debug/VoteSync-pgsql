'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Vote, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Candidate } from '@/lib/types';
import { useState } from 'react';

interface CandidateVoteFormProps {
  electionId: string;
  candidate: Candidate;
  voterId: string;
}

export function CandidateVoteForm({ electionId, candidate, voterId }: CandidateVoteFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleVote() {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId, candidateId: candidate.id, voterId }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal memberikan suara.');
      }

      toast({
        title: 'Suara anda berhasil dicatat!',
        //description: `Suara Anda untuk ${candidate.name} telah direkam.`,
      });

      // Navigate back to the main vote dashboard
      router.push('/vote');

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Memberikan Suara',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan atau Anda mungkin sudah memilih.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full" disabled={isSubmitting}>
          <Vote className="mr-2 h-4 w-4" />
          Pilih
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Pilihan Anda</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin memilih <span className="font-bold">{candidate.name}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleVote} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Konfirmasi Pilihan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
