'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, Vote as VoteIcon, Lock, Clock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VoterLogoutButton } from './components/voter-logout-button';
import { getVoterSession } from '@/lib/session-client';
import { useEffect, useState, useMemo } from 'react';
import Loading from '../loading';
import type { VoterSessionPayload, Election, Voter, Category } from '@/lib/types';
import { getPublicElections, getPublicCategories } from '@/app/actions/public';

export default function VoterDashboardPage() {
  const router = useRouter();
  const [elections, setElections] = useState<Election[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPublicDataLoading, setIsPublicDataLoading] = useState(true);

  const [voter, setVoter] = useState<Voter | undefined>(undefined);
  const [isLoadingVoters, setIsLoadingVoters] = useState(true);
  const [session, setSession] = useState<VoterSessionPayload | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const voterSession = getVoterSession();
    if (!voterSession?.voterId) {
      router.push('/');
    } else {
      setSession(voterSession);
    }
    setIsSessionLoading(false);
  }, [router]);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [electionsResult, categoriesResult] = await Promise.all([
          getPublicElections(),
          getPublicCategories()
        ]);

        if (electionsResult.success && electionsResult.data) {
          setElections(electionsResult.data);
        }
        if (categoriesResult.success && categoriesResult.data) {
          setCategories(categoriesResult.data);
        }
      } finally {
        setIsPublicDataLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  useEffect(() => {
    const fetchVoter = async () => {
      if (!session?.voterId) return;

      // Import dynamically to avoid server action issues if any, or just direct import
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
      // If session loading is done but no session, stop loading voters
      setIsLoadingVoters(false);
    }
  }, [session, isSessionLoading]);

  const followedElections = useMemo(() => {
    if (!voter || !voter.category || elections.length === 0 || categories.length === 0) return [];

    const voterCategory = categories.find(c => c.id === voter.category);
    if (!voterCategory || !voterCategory.allowedElections) return [];

    const followed = voterCategory.allowedElections.map(electionId =>
      elections.find(e => e.id === electionId)
    ).filter((e): e is Election => !!e);

    return followed;
  }, [voter, elections, categories]);

  const availableElections = useMemo(() => {
    return followedElections.filter(e => e.status === 'active');
  }, [followedElections]);

  const isLoading = isSessionLoading || isLoadingVoters || isPublicDataLoading;

  if (isLoading || (session && !voter)) {
    return <Loading />;
  }

  const now = new Date();

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Dasbor Pemilih</h1>
            <p className="text-muted-foreground">Selamat datang! Silakan gunakan hak pilih Anda.</p>
          </div>
          <VoterLogoutButton />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <CardTitle className="text-xl">Informasi Pemilih</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="space-y-3">
                <div className="grid grid-cols-[120px_auto_1fr] items-start">
                  <div className="text-muted-foreground">Nama</div>
                  <div className="font-semibold mx-2">:</div>
                  <div className="font-semibold break-words">{voter?.name}</div>
                </div>
                <div className="grid grid-cols-[120px_auto_1fr] items-start">
                  <div className="text-muted-foreground">NIK</div>
                  <div className="font-semibold mx-2">:</div>
                  <div className="font-semibold break-words">{voter?.nik || '-'}</div>
                </div>
                <div className="grid grid-cols-[120px_auto_1fr] items-start">
                  <div className="text-muted-foreground">Tempat, Tgl Lahir</div>
                  <div className="font-semibold mx-2">:</div>
                  <div className="font-semibold break-words">{voter?.birthPlace || '-'} {voter?.birthPlace && voter?.birthDate ? ', ' : ''} {voter?.birthDate || '-'}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[120px_auto_1fr] items-start">
                  <div className="text-muted-foreground">Jenis Kelamin</div>
                  <div className="font-semibold mx-2">:</div>
                  <div className="font-semibold break-words">{voter?.gender || '-'}</div>
                </div>
                <div className="grid grid-cols-[120px_auto_1fr] items-start">
                  <div className="text-muted-foreground">Alamat</div>
                  <div className="font-semibold mx-2">:</div>
                  <div className="font-semibold break-words">{voter?.address || '-'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {availableElections.length > 0 ? (
          <div className="space-y-4">
            {availableElections.map(election => {
              const hasVoted = voter?.hasVoted?.[election.id] === true;
              const electionStarted = election.startDate ? new Date(election.startDate) <= now : true;
              const electionEnded = election.endDate ? new Date(election.endDate) < now : false;

              let content;

              if (hasVoted) {
                content = (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Anda sudah memberikan suara dalam pemilihan ini.</span>
                  </div>
                );
              } else if (electionEnded) {
                content = (
                  <div className="flex items-center gap-2 text-red-600">
                    <Lock className="h-5 w-5" />
                    <span className="font-medium">Pemilihan ini telah berakhir.</span>
                  </div>
                );
              } else if (!electionStarted) {
                content = (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Pemilihan ini belum dimulai.</span>
                  </div>
                );
              } else {
                content = (
                  <Link href={`/vote/${election.id}`}>
                    <Button className="w-full">
                      <VoteIcon className="mr-2 h-4 w-4" />
                      Masuk ke Halaman Voting
                    </Button>
                  </Link>
                );
              }

              return (
                <Card key={election.id} className="bg-primary/10">
                  <CardHeader>
                    <CardTitle>{election.name}</CardTitle>
                    <CardDescription>{election.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {content}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Tidak ada pemilihan yang tersedia untuk Anda saat ini.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
