'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vote, Users, Box, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import Loading from '@/app/loading';
import { useEffect, useState } from 'react';
import { getVoters } from '@/app/actions/voters';
import { getElections } from '@/app/actions/elections';
import { getCategories } from '@/app/actions/categories';
import type { Voter, Election, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function Dashboard() {
  const [elections, setElections] = useState<Election[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [votersRes, electionsRes, categoriesRes] = await Promise.all([
          getVoters(),
          getElections(),
          getCategories()
        ]);

        if (votersRes.success && votersRes.data) {
          setVoters(votersRes.data);
        }
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
          description: 'Gagal memuat data dashboard.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  if (isLoading) {
    return <Loading />;
  }

  const now = new Date();

  const totalElections = elections.length;
  const totalVoters = voters.length;
  const totalCategories = categories.length;
  const activeElections = elections.filter(e => {
    const isScheduled = e.startDate && e.endDate && new Date(e.startDate) <= now && new Date(e.endDate) > now;
    return e.status === 'active' && isScheduled;
  }).length;
  const finishedElections = elections.filter(e => e.endDate && new Date(e.endDate) < now).length;

  const stats = [
    { title: 'Total Elections', value: totalElections, icon: <Vote className="h-6 w-6 text-muted-foreground" />, href: '/admin/elections' },
    { title: 'Total Voters', value: totalVoters, icon: <Users className="h-6 w-6 text-muted-foreground" />, href: '/admin/voters' },
    { title: 'Voter Categories', value: totalCategories, icon: <Box className="h-6 w-6 text-muted-foreground" />, href: '/admin/categories' },
    { title: 'Active Elections', value: activeElections, icon: <Clock className="h-6 w-6 text-muted-foreground" />, href: '/admin/elections' },
    { title: 'Finished Elections', value: finishedElections, icon: <CheckCircle className="h-6 w-6 text-muted-foreground" />, href: '/admin/elections' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          An overview of the VoteSync system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Link href={stat.href} key={stat.title}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use the sidebar to manage elections, voters, categories, and view results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
