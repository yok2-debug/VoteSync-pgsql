'use client';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import type { Election, Voter, Candidate, Category } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ElectionPieChart } from './election-pie-chart';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const getCandidateDisplayName = (candidate: Candidate) => {
  return candidate.viceCandidateName
    ? `${candidate.name} & ${candidate.viceCandidateName}`
    : candidate.name;
}

// Largest Remainder Method for accurate 100% total
function calculatePercentages(votes: number[], decimals: number = 2): number[] {
  const total = votes.reduce((sum, v) => sum + v, 0);
  if (total === 0) return votes.map(() => 0);

  const multiplier = Math.pow(10, decimals);
  const target = 100 * multiplier; // e.g., 10000 for 2 decimals

  // Calculate raw percentages and floor values
  const rawPercentages = votes.map(v => (v / total) * target);
  const floorValues = rawPercentages.map(p => Math.floor(p));
  const remainders = rawPercentages.map((p, i) => ({ index: i, remainder: p - floorValues[i] }));

  // Calculate how many units we need to distribute
  const floorSum = floorValues.reduce((sum, v) => sum + v, 0);
  let unitsToDistribute = target - floorSum;

  // Sort by remainder descending and distribute extra units
  remainders.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < unitsToDistribute && i < remainders.length; i++) {
    floorValues[remainders[i].index]++;
  }

  // Convert back to percentages with proper decimals
  return floorValues.map(v => v / multiplier);
}

interface RealCountDisplayProps {
  election: Election;
  categories: Category[];
  voterCounts: Record<string, number>;
  isMain: boolean;
}

export function RealCountDisplay({ election, categories, voterCounts, isMain }: RealCountDisplayProps) {
  const [now, setNow] = useState(new Date());
  const defaultAvatar = PlaceHolderImages.find(p => p.id === 'default-avatar');

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 15000); // every 15 seconds
    return () => clearInterval(timer);
  }, []);

  const liveResults = election.results || {};
  // Calculate total votes by summing all candidate votes (since election.votes is not used for privacy)
  const liveTotalVotes = Object.values(liveResults).reduce((sum, count) => sum + count, 0);

  const DPT = useMemo(() => {
    const allowedCategoryIds = new Set(
      categories.filter(c => c.allowedElections?.includes(election.id)).map(c => c.id)
    );

    // Sum counts for allowed categories
    let total = 0;
    allowedCategoryIds.forEach(catId => {
      total += voterCounts[catId] || 0;
    });
    return total;
  }, [voterCounts, categories, election.id]);

  const candidates = useMemo(() =>
    Object.values(election.candidates || {})
      .sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999)),
    [election.candidates]
  );

  // Calculate percentages using largest remainder method
  const candidatePercentages = useMemo(() => {
    const votes = candidates.map(c => liveResults[c.id] || 0);
    const percentages = calculatePercentages(votes, 2);
    const map = new Map<string, number>();
    candidates.forEach((c, i) => map.set(c.id, percentages[i]));
    return map;
  }, [candidates, liveResults]);

  const votesMasukPercentage = DPT > 0 ? (liveTotalVotes / DPT) * 100 : 0; // percentage of eligible voters who have voted

  const chartData = useMemo(() => {
    return candidates.map((candidate, index) => ({
      id: candidate.id,
      name: getCandidateDisplayName(candidate),
      value: liveResults[candidate.id] || 0,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`
    }));
  }, [candidates, liveResults]);

  const candidateColorMap = useMemo(() => {
    return new Map(chartData.map(d => [d.id, d.fill]));
  }, [chartData]);

  const getScheduleStatusBadge = (election: Election) => {
    const startDate = election.startDate ? new Date(election.startDate) : null;
    const endDate = election.endDate ? new Date(election.endDate) : null;

    if (endDate && now > endDate) {
      return <Badge variant="destructive">Berakhir</Badge>;
    }
    if (startDate && now >= startDate && endDate && now < endDate) {
      return <Badge className="bg-green-500 text-white hover:bg-green-500/90">Berlangsung</Badge>;
    }
    if (startDate && now < startDate) {
      return <Badge className="bg-blue-500 text-white hover:bg-blue-500/90">Belum Mulai</Badge>;
    }
    return <Badge variant="secondary">Jadwal Tidak Diatur</Badge>;
  };

  if (!isMain) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-lg">{election.name}</CardTitle>
            {getScheduleStatusBadge(election)}
          </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
          <ul className="space-y-3 text-sm">
            {candidates.map(candidate => {
              const candidateVotes = liveResults[candidate.id] || 0;
              const percentage = candidatePercentages.get(candidate.id) || 0;
              return (
                <li key={candidate.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div className='flex items-center gap-2 flex-1 min-w-0'>
                      <Image
                        src={candidate.photo || defaultAvatar?.imageUrl || '/placeholder.png'}
                        alt={`Foto ${candidate.name}`}
                        width={24}
                        height={24}
                        className="rounded-full object-cover w-6 h-6 border"
                        unoptimized
                      />
                      <span className="break-words font-medium text-xs">
                        {getCandidateDisplayName(candidate)}
                      </span>
                    </div>
                    <span className="font-semibold text-nowrap flex flex-col items-end text-xs">
                      <span className="font-bold">{percentage.toFixed(2)}%</span>
                      <span className="text-xs font-normal text-muted-foreground">({candidateVotes} suara)</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle>{election.name}</CardTitle>
          {getScheduleStatusBadge(election)}
        </div>
        <CardDescription>{election.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Suara Masuk</span>
            <span>{liveTotalVotes} dari {DPT} Pemilih</span>
          </div>
          <Progress value={votesMasukPercentage} />
          <div className="text-right text-xs text-muted-foreground">
            {votesMasukPercentage.toFixed(2)}%
          </div>
        </div>

        <div className="space-y-8">
          <div className="w-full">
            <ElectionPieChart data={chartData} />
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-center md:text-left">Perolehan Suara</h4>
            <ul className="space-y-3 text-sm">
              {candidates.map(candidate => {
                const candidateVotes = liveResults[candidate.id] || 0;
                const percentage = candidatePercentages.get(candidate.id) || 0;
                return (
                  <li key={candidate.id}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                          style={{ backgroundColor: candidateColorMap.get(candidate.id) }}
                        ></span>
                        <span
                          className="break-words font-medium"
                          style={{ color: candidateColorMap.get(candidate.id) }}
                        >
                          {getCandidateDisplayName(candidate)}
                        </span>
                      </div>
                      <span className="font-bold text-nowrap flex flex-col items-end">
                        <span>{percentage.toFixed(2)}%</span>
                        <span className="text-xs font-normal text-muted-foreground">({candidateVotes} suara)</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

