'use client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import type { Election } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface RealCountSettingsProps {
    elections: Election[];
    onSuccess: () => void;
}

export function RealCountSettings({ elections, onSuccess }: RealCountSettingsProps) {
    const [selections, setSelections] = useState<Record<string, { show: boolean, main: boolean }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const initialSelection: Record<string, { show: boolean, main: boolean }> = {};
        elections.forEach(election => {
            initialSelection[election.id] = {
                show: election.showInRealCount || false,
                main: election.isMainInRealCount || false,
            };
        });
        setSelections(initialSelection);
    }, [elections]);

    const handleMainChange = (electionId: string) => {
        setSelections(prev => {
            const newSelections = { ...prev };
            for (const id in newSelections) {
                newSelections[id] = { ...newSelections[id], main: id === electionId };
            }
            // An election marked as main should always be shown
            if (newSelections[electionId]) {
                newSelections[electionId].show = true;
            }
            return newSelections;
        });
    };

    const handleShowChange = (electionId: string, checked: boolean) => {
        setSelections(prev => {
            const isCurrentlyMain = prev[electionId]?.main;
            // Cannot uncheck if it's the main election
            if (isCurrentlyMain && !checked) {
                return prev;
            }
            return {
                ...prev,
                [electionId]: { ...prev[electionId], show: checked }
            };
        });
    };

    const handleSaveChanges = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/settings/real-count', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selections, originalElections: elections }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Gagal menyimpan pengaturan.');
            }

            toast({
                title: 'Pengaturan Berhasil Disimpan',
                description: 'Tampilan halaman Real Count telah diperbarui.',
            });
            onSuccess();

        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal Menyimpan Pengaturan',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const mainElectionId = Object.keys(selections).find(id => selections[id].main) || '';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pengaturan Tampilan Real Count</CardTitle>
                <CardDescription>Pilih pemilihan mana yang akan ditampilkan di halaman publik Real Count dan tentukan satu sebagai Tampilan Utama.</CardDescription>
            </CardHeader>
            <CardContent>
                {elections.length > 0 ? (
                    <div className="space-y-4">
                        <RadioGroup value={mainElectionId} onValueChange={handleMainChange}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-1 border rounded-md">
                                {elections.map((election) => (
                                    <div key={election.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                            <Checkbox
                                                id={`show-${election.id}`}
                                                checked={selections[election.id]?.show || false}
                                                onCheckedChange={(checked) => handleShowChange(election.id, Boolean(checked))}
                                                disabled={selections[election.id]?.main}
                                                aria-label={`Tampilkan ${election.name}`}
                                            />
                                            <RadioGroupItem value={election.id} id={`main-${election.id}`} aria-label={`Jadikan utama ${election.name}`} />
                                        </div>
                                        <Label htmlFor={`show-${election.id}`} className="font-normal cursor-pointer flex-grow">{election.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground">
                            Pilih kotak centang untuk menampilkan di Real Count. Pilih tombol radio untuk menjadikannya Tampilan Utama. Pemilihan utama akan selalu ditampilkan.
                        </p>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">Tidak ada pemilihan yang tersedia untuk dikonfigurasi.</p>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Perubahan
                </Button>
            </CardFooter>
        </Card>
    );
}
