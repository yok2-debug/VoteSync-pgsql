'use client';

import { useEffect, useMemo, useState } from 'react';
import Autoplay from "embla-carousel-autoplay";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from '@/lib/utils';
import { RealCountDisplay } from '@/app/real-count/components/real-count-display';
import { getAdminRealCountElections } from '@/app/actions/real-count';
import { getPublicCategories } from '@/app/actions/public';
import { getAdminVoterCountsByCategory } from '@/app/actions/voters';
import Loading from '@/app/loading';
import type { Election, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminRealCountPage() {
    const [elections, setElections] = useState<Election[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [voterCounts, setVoterCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        let isMounted = true;

        const fetchData = async (isInitial = false) => {
            try {
                const [
                    electionsResult,
                    categoriesResult,
                    voterCountsResult,
                ] = await Promise.all([
                    getAdminRealCountElections(),
                    getPublicCategories(),
                    getAdminVoterCountsByCategory(),
                ]);

                if (!isMounted) return;

                if (electionsResult.success && electionsResult.data) {
                    setElections(electionsResult.data);
                } else if (electionsResult.message) {
                    toast({
                        variant: 'destructive',
                        title: 'Gagal memuat Real Count',
                        description: electionsResult.message,
                    });
                }

                if (categoriesResult.success && categoriesResult.data) {
                    setCategories(categoriesResult.data);
                }

                if (voterCountsResult.success && voterCountsResult.data) {
                    setVoterCounts(voterCountsResult.data);
                }
            } catch {
                if (isMounted && isInitial) {
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Gagal memuat data Real Count.',
                    });
                }
            } finally {
                if (isMounted && isInitial) {
                    setIsLoading(false);
                }
            }
        };

        fetchData(true);

        const intervalId = setInterval(() => {
            fetchData(false);
        }, 10000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [toast]);

    const sortedElections = useMemo(
        () => [...elections].sort((a, b) => a.name.localeCompare(b.name)),
        [elections]
    );

    // Follow the public Real Count main-election setting.
    // If no main election is configured, fall back to the first election.
    const mainElection =
        sortedElections.find((election) => election.isMainInRealCount) ??
        sortedElections[0];

    const otherElections = sortedElections.filter(
        (election) => election.id !== mainElection?.id
    );

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Real Count
                </h1>
                <p className="text-muted-foreground">
                    Pantauan hasil perolehan suara secara real-time.
                </p>
            </div>

            {sortedElections.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">
                        Belum ada pemilihan.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div
                        className={cn(
                            "order-1",
                            otherElections.length === 0
                                ? "lg:col-span-3"
                                : "lg:col-span-2"
                        )}
                    >
                        <RealCountDisplay
                            key={mainElection.id}
                            election={mainElection}
                            categories={categories}
                            voterCounts={voterCounts}
                            isMain={true}
                        />
                    </div>

                    {otherElections.length > 0 && (
                        <div className="relative order-2 lg:col-span-1">
                            <Carousel
                                opts={{
                                    align: "start",
                                    loop: true,
                                }}
                                plugins={[
                                    Autoplay({
                                        delay: 5000,
                                        stopOnInteraction: false,
                                        stopOnMouseEnter: true,
                                    }),
                                ]}
                                orientation="vertical"
                                className="w-full"
                            >
                                <CarouselContent className="-mt-2 h-[500px]">
                                    {otherElections.map((election) => (
                                        <CarouselItem
                                            key={election.id}
                                            className="pt-2 basis-1/2"
                                        >
                                            <RealCountDisplay
                                                election={election}
                                                categories={categories}
                                                voterCounts={voterCounts}
                                                isMain={false}
                                            />
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>

                                {otherElections.length > 2 && (
                                    <>
                                        <CarouselPrevious className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-10" />
                                        <CarouselNext className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-10" />
                                    </>
                                )}
                            </Carousel>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
