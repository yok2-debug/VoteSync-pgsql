'use client';
import { useState, useEffect } from 'react';
import { getElections } from '@/app/actions/elections';
import type { Election } from '@/lib/types';
import Loading from '@/app/loading';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function RecapitulationDashboardPage() {
    const [elections, setElections] = useState<Election[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchElections = async () => {
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
        };

        fetchElections();
    }, [toast]);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Rekapitulasi Pemilihan</h1>
                <p className="text-muted-foreground">
                    Pilih pemilihan untuk melihat atau membuat laporan rekapitulasi.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pemilihan</CardTitle>
                    <CardDescription>
                        Kelola dan lihat rekapitulasi hasil pemilihan.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Pemilihan</TableHead>
                                <TableHead className="w-[200px] text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {elections.length > 0 ? (
                                elections.map((election) => (
                                    <TableRow key={election.id}>
                                        <TableCell>
                                            <div className="font-medium">{election.name}</div>
                                            <div className="text-sm text-muted-foreground">{election.description}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/admin/recapitulation/${election.id}`}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Lihat Rekapitulasi
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        Tidak ada pemilihan yang tersedia.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
