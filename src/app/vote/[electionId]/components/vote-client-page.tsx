'use client';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CandidateVoteForm } from './candidate-vote-form';
import { VoterLogoutButton } from '../../components/voter-logout-button';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { getVoterSession } from '@/lib/session-client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Loading from '@/app/loading';
import type { Voter, VoterSessionPayload, Election } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getPublicElections } from '@/app/actions/public';

export function VoteClientPage() {
  const { electionId } = useParams() as { electionId: string };
  const [elections, setElections] = useState<Election[]>([]);
  const [isElectionsLoading, setIsElectionsLoading] = useState(true);
  const [voter, setVoter] = useState<Voter | undefined>(undefined);
  const [isLoadingVoters, setIsLoadingVoters] = useState(true);
  const [session, setSession] = useState<VoterSessionPayload | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const result = await getPublicElections();
        if (result.success && result.data) {
          setElections(result.data);
        }
      } catch (error) {
        // Error handled silently
      } finally {
        setIsElectionsLoading(false);
      }
    };
    fetchElections();
  }, []);

  useEffect(() => {
    const voterSession = getVoterSession();
    if (!voterSession?.voterId) {
      router.replace('/');
      return;
    }
    setSession(voterSession);
    setIsSessionLoading(false);
  }, [router]);

  useEffect(() => {
    const fetchVoter = async () => {
      if (!session?.voterId) return;

      const { getVoter } = await import('@/app/actions/voters');
      const result = await getVoter(session.voterId);

      if (result.success && result.data) {
        setVoter(result.data);
      }
      setIsLoadingVoters(false);
    };

    if (session?.voterId) {
      fetchVoter();
    } else if (!isSessionLoading) {
      setIsLoadingVoters(false);
    }
  }, [session, isSessionLoading]);

  const election = useMemo(() => {
    if (isElectionsLoading) return undefined;
    return elections.find(e => e.id === electionId);
  }, [elections, electionId, isElectionsLoading]);

  useEffect(() => {
    if (isElectionsLoading || isSessionLoading || isLoadingVoters) {
      return; // Wait for all data to be loaded
    }

    // Stricter check: ensure election and voter are loaded before validation
    if (!election || !voter) {
      if (!isElectionsLoading && !isSessionLoading && !isLoadingVoters) {
        // If DB is not loading and we still can't find them, redirect.
        router.replace('/vote');
      }
      return;
    }

    const now = new Date();
    const electionStarted = election.startDate ? new Date(election.startDate) <= now : true;
    const electionEnded = election.endDate ? new Date(election.endDate) < now : false;
    const hasVoted = voter.hasVoted?.[electionId];

    if (
      election.status !== 'active' ||
      !electionStarted ||
      electionEnded ||
      hasVoted
    ) {
      router.replace('/vote');
      return;
    }

    setIsValid(true);

  }, [isElectionsLoading, isSessionLoading, isLoadingVoters, election, voter, electionId, router]);


  if (!isValid || !election || !voter) {
    return <Loading />;
  }

  const candidates = Object.values(election.candidates || {}).sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999));
  const defaultAvatar = PlaceHolderImages.find(p => p.id === 'default-avatar');

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 sm:p-8">
      <div className="w-full max-w-7xl space-y-8">
        <header className="flex w-full items-center justify-between">
          <Button asChild variant="outline">
            <Link href="/vote">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
          <VoterLogoutButton />
        </header>

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{election.name}</h1>
          <p className="text-muted-foreground">Pilih kandidat pilihan Anda di bawah ini.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {candidates.map(candidate => (
            <Card key={candidate.id} className="flex flex-col w-full max-w-sm overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex flex-col items-center p-6 bg-card/80">
                <div className="relative">
                  <span className="absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold border-4 border-background">
                    {candidate.orderNumber}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Image
                        src={candidate.photo || defaultAvatar?.imageUrl || 'https://picsum.photos/seed/default/400/400'}
                        alt={`Photo of ${candidate.name}`}
                        width={160}
                        height={160}
                        className="rounded-full border-4 border-primary object-cover cursor-pointer hover:opacity-90 transition-opacity h-40 w-40"
                        unoptimized
                      />
                    </DialogTrigger>
                    <DialogContent className="max-w-xl p-2 border-0 bg-transparent shadow-none">
                      <DialogHeader>
                        <DialogTitle className="sr-only">
                          Foto {candidate.name} diperbesar
                        </DialogTitle>
                      </DialogHeader>
                      <DialogClose asChild>
                        <Image
                          src={candidate.photo || defaultAvatar?.imageUrl || 'https://picsum.photos/seed/default/400/400'}
                          alt={`Photo of ${candidate.name}`}
                          width={400}
                          height={400}
                          className="w-full h-auto rounded-md cursor-pointer"
                          unoptimized
                        />
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col items-center p-4 text-center">
                <h3 className="text-xl font-bold">
                  <span className="block">{candidate.name}</span>
                  {candidate.viceCandidateName && <span className="block text-lg font-medium">&</span>}
                  {candidate.viceCandidateName && <span className="block">{candidate.viceCandidateName}</span>}
                </h3>
              </CardContent>
              <CardFooter className="p-4 bg-muted/50 grid grid-cols-2 gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      Visi Misi
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {candidate.name}
                        {candidate.viceCandidateName && ` & ${candidate.viceCandidateName}`}
                      </DialogTitle>
                      <DialogDescription>
                        Visi dan Misi Kandidat
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                      <article className="prose dark:prose-invert max-w-none">
                        <h3 className="font-semibold text-lg mb-2">Visi</h3>
                        <ReactMarkdown>{candidate.vision || 'Tidak ada visi yang diberikan.'}</ReactMarkdown>
                        <h3 className="font-semibold text-lg mt-4 mb-2">Misi</h3>
                        <ReactMarkdown>{candidate.mission || 'Tidak ada misi yang diberikan.'}</ReactMarkdown>
                      </article>
                    </div>
                  </DialogContent>
                </Dialog>
                <CandidateVoteForm electionId={election.id} candidate={candidate} voterId={voter.id} />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
