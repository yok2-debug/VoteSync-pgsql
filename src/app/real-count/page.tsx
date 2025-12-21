'use client';
import { PublicNavbar } from '@/components/public-navbar';
import { RealCountDisplay } from './components/real-count-display';
import Loading from '../loading';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { getPublicElections, getPublicCategories } from '@/app/actions/public';
import { getVoterCountsByCategory } from '@/app/actions/voters';
import type { Election, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


export default function RealCountPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [voterCounts, setVoterCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async (isInitial = false) => {
      try {
        const [electionsResult, categoriesResult, voterCountsResult] = await Promise.all([
          getPublicElections(),
          getPublicCategories(),
          getVoterCountsByCategory()
        ]);

        if (isMounted) {
          if (electionsResult.success && electionsResult.data) {
            setElections(electionsResult.data);
          }

          if (categoriesResult.success && categoriesResult.data) {
            setCategories(categoriesResult.data);
          }

          if (voterCountsResult.success && voterCountsResult.data) {
            setVoterCounts(voterCountsResult.data);
          }
        }
      } catch (error) {
        // Error handled silently in production
      } finally {
        if (isMounted && isInitial) {
          setIsLoading(false);
        }
      }
    };

    fetchData(true);

    const intervalId = setInterval(() => {
      fetchData(false);
    }, 10000); // Poll every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const mainElection = useMemo(() =>
    elections.find(e => e.isMainInRealCount === true && e.showInRealCount === true && e.status === 'active'),
    [elections]
  );

  const otherElections = useMemo(() =>
    elections.filter(e => e.id !== mainElection?.id && e.showInRealCount === true && e.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name)),
    [elections, mainElection]
  );

  if (isLoading) {
    return <Loading />;
  }

  const noElectionsToShow = !mainElection && otherElections.length === 0;

  return (
    <>
      <PublicNavbar />
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 pt-20">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col space-y-2 text-center mb-[30px]">
            <h1 className="text-xl font-bold tracking-tight">Real Count Pemilihan</h1>
            <p className="text-sm text-muted-foreground">Pantauan hasil perolehan suara secara real-time.</p>
          </div>

          {noElectionsToShow ? (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">Tidak ada pemilihan yang ditampilkan di Real Count saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {mainElection && (
                <div className="lg:col-span-2">
                  <RealCountDisplay
                    key={mainElection.id}
                    election={mainElection}
                    categories={categories}
                    voterCounts={voterCounts}
                    isMain={true}
                  />
                </div>
              )}

              {otherElections.length > 0 && (
                <div className={cn(
                  "relative",
                  !mainElection ? "lg:col-span-3" : "lg:col-span-1"
                )}>
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
                    <CarouselContent className="-mt-2 h-[600px]">
                      {otherElections.map(election => (
                        <CarouselItem key={election.id} className="pt-2 basis-1/2">
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
      </main>
    </>
  );
}
