'use client';
import Image from 'next/image';
import { LoginForm } from '@/components/login-form';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { PublicNavbar } from '@/components/public-navbar';
import { Badge } from '@/components/ui/badge';
import Loading from './loading';
import { useMemo, useState, useEffect } from 'react';
import type { Candidate, Election } from '@/lib/types';
import { format } from 'date-fns';
import { Calendar, Users } from 'lucide-react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import ReactMarkdown from 'react-markdown';
import { getPublicElections } from '@/app/actions/public';

export default function LoginPage() {
    const [elections, setElections] = useState<Election[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                setIsLoading(false);
            }
        };
        fetchElections();
    }, []);

    const activeElections = useMemo(
        () => elections.filter((e) => e.status === 'active'),
        [elections]
    );

    const now = new Date();

    const getStatus = (election: { startDate?: string; endDate?: string }) => {
        const startDate = election.startDate ? new Date(election.startDate) : null;
        const endDate = election.endDate ? new Date(election.endDate) : null;

        if (endDate && now > endDate) {
            return <Badge variant="destructive">Telah Berakhir</Badge>;
        }
        if (startDate && now >= startDate) {
            return <Badge className="bg-green-500 text-white">Sedang Berlangsung</Badge>;
        }
        return <Badge variant="secondary">Akan Datang</Badge>;
    };

    const formatSchedule = (start?: string, end?: string) => {
        if (!start || !end) return 'Jadwal belum ditentukan';
        try {
            const startDate = new Date(start);
            const endDate = new Date(end);
            // e.g., 17 Agu 2024, 09:00 - 17:00
            const startFormat = format(startDate, 'd MMM yyyy, HH:mm');
            const endFormat = format(endDate, 'HH:mm');
            return `${startFormat} - ${endFormat}`;
        } catch (e) {
            return 'Jadwal tidak valid';
        }
    }

    const defaultAvatar = PlaceHolderImages.find(p => p.id === 'default-avatar');

    return (
        <>
            <PublicNavbar />
            <main className="flex-grow pt-16">
                <div className="relative py-10 bg-gradient-to-br from-primary via-primary/90 to-accent">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl md:text-5xl">
                            Selamat Datang di VoteSync
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-primary-foreground/80">
                            Platform e-voting yang aman, transparan, dan mudah digunakan untuk menyukseskan pemilihan Anda.
                        </p>
                    </div>
                </div>
                <div className="container mx-auto px-4 py-10 max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12 items-start">
                        <div className="space-y-6 md:col-span-2">
                            <h2 className="text-2xl font-semibold tracking-tight text-center md:text-left">Pemilihan Aktif</h2>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <p className="text-muted-foreground">Memuat data pemilihan...</p>
                                </div>
                            ) : activeElections.length > 0 ? (
                                <div className="space-y-6">
                                    {activeElections.map((election: Election) => {
                                        const candidates = election.candidates ? Object.values(election.candidates).sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999)) : [];
                                        return (
                                            <Card key={election.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
                                                <CardHeader>
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle>{election.name}</CardTitle>
                                                        {getStatus(election)}
                                                    </div>
                                                    <CardDescription>{election.description}</CardDescription>
                                                    <div className="flex items-center pt-2 text-sm text-muted-foreground gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>{formatSchedule(election.startDate, election.endDate)}</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="flex-grow flex items-end justify-between">
                                                    <p className="text-sm text-muted-foreground">
                                                        Jumlah Kandidat: {candidates.length}
                                                    </p>
                                                    {candidates.length > 0 && (
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="secondary">
                                                                    <Users className="mr-2 h-4 w-4" />
                                                                    Lihat Kandidat
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-3xl pb-2">
                                                                <DialogHeader>
                                                                    <DialogTitle>Kandidat untuk {election.name}</DialogTitle>
                                                                    <DialogDescription>
                                                                        Berikut adalah daftar kandidat yang berpartisipasi beserta visi dan misi mereka.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
                                                                    {candidates.map((candidate: Candidate) => (
                                                                        <Card key={candidate.id} className="flex flex-col sm:flex-row items-start gap-4 p-4">
                                                                            <div className="flex-shrink-0 flex flex-col items-center gap-2 w-full sm:w-32">
                                                                                <div className="relative">
                                                                                    <span className="absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold border-2 border-background">
                                                                                        {candidate.orderNumber}
                                                                                    </span>
                                                                                    <Dialog>
                                                                                        <DialogTrigger asChild>
                                                                                            <Image
                                                                                                src={candidate.photo || defaultAvatar?.imageUrl || '/placeholder.png'}
                                                                                                alt={`Foto ${candidate.name}`}
                                                                                                width={100}
                                                                                                height={100}
                                                                                                className="rounded-full object-cover w-24 h-24 border cursor-pointer hover:opacity-90 transition-opacity"
                                                                                                unoptimized
                                                                                            />
                                                                                        </DialogTrigger>
                                                                                        <DialogContent className="p-0 border-0 max-w-xl bg-transparent shadow-none">
                                                                                            <DialogHeader>
                                                                                                <DialogTitle className="sr-only">
                                                                                                    Foto {candidate.name} diperbesar
                                                                                                </DialogTitle>
                                                                                            </DialogHeader>
                                                                                            <DialogClose asChild>
                                                                                                <Image
                                                                                                    src={candidate.photo || defaultAvatar?.imageUrl || '/placeholder.png'}
                                                                                                    alt={`Foto ${candidate.name}`}
                                                                                                    width={400}
                                                                                                    height={400}
                                                                                                    className="w-full h-auto rounded-md cursor-pointer"
                                                                                                    unoptimized
                                                                                                />
                                                                                            </DialogClose>
                                                                                        </DialogContent>
                                                                                    </Dialog>
                                                                                </div>
                                                                                <div className="text-center">
                                                                                    <p className="font-bold">{candidate.name}</p>
                                                                                    {candidate.viceCandidateName && <p className="text-sm text-muted-foreground">{candidate.viceCandidateName}</p>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex-grow border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4">
                                                                                <article className="prose prose-sm dark:prose-invert max-w-none">
                                                                                    <h4>Visi</h4>
                                                                                    <ReactMarkdown>{candidate.vision || 'Visi belum tersedia.'}</ReactMarkdown>
                                                                                    <h4 className="mt-4">Misi</h4>
                                                                                    <ReactMarkdown>{candidate.mission || 'Misi belum tersedia.'}</ReactMarkdown>
                                                                                </article>
                                                                            </div>
                                                                        </Card>
                                                                    ))}
                                                                </div>
                                                                <DialogFooter className="sm:justify-end pt-4">
                                                                    <DialogClose asChild>
                                                                        <Button type="button" variant="secondary">
                                                                            Tutup
                                                                        </Button>
                                                                    </DialogClose>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            ) : (
                                <Card className="shadow-lg">
                                    <CardContent className="p-10 text-center text-muted-foreground">
                                        Tidak ada pemilihan yang sedang aktif saat ini.
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-6 md:col-span-1">
                            <h2 className="text-2xl font-semibold tracking-tight text-center md:text-left">Login Pemilih</h2>
                            <Card className="shadow-lg">
                                <CardHeader className="text-center">
                                    <CardDescription>
                                        Silakan masuk menggunakan ID Pemilih dan Kata Sandi Anda untuk memberikan suara.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <LoginForm />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
