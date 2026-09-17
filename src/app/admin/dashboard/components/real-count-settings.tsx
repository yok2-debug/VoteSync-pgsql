'use client';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

const NO_MAIN_ELECTION = '__none__';

export function RealCountSettings({
    elections,
    onSuccess,
}: RealCountSettingsProps) {
    const [mainElectionId, setMainElectionId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const currentMainElection = elections.find(
            (election) => election.isMainInRealCount
        );

        setMainElectionId(currentMainElection?.id || '');
    }, [elections]);

    const handleSaveChanges = async () => {
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/settings/real-count', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mainElectionId: mainElectionId || null,
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(
                    result.message || 'Gagal menyimpan pengaturan.'
                );
            }

            toast({
                title: 'Pengaturan Berhasil Disimpan',
                description:
                    'Pemilihan utama Real Count telah diperbarui.',
            });

            onSuccess();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal Menyimpan Pengaturan',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Terjadi kesalahan tidak diketahui.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pengaturan Real Count</CardTitle>
                <CardDescription>
                    Pilih satu pemilihan sebagai tampilan utama pada halaman
                    Real Count publik. Semua pemilihan yang sudah berakhir
                    akan tetap tersedia secara otomatis.
                </CardDescription>
            </CardHeader>

            <CardContent>
                {elections.length > 0 ? (
                    <RadioGroup
                        value={mainElectionId || NO_MAIN_ELECTION}
                        onValueChange={(value) =>
                            setMainElectionId(
                                value === NO_MAIN_ELECTION ? '' : value
                            )
                        }
                    >
                        <div className="space-y-2">
                            <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50">
                                <RadioGroupItem
                                    value={NO_MAIN_ELECTION}
                                    id="main-none"
                                />
                                <Label
                                    htmlFor="main-none"
                                    className="font-normal cursor-pointer flex-1"
                                >
                                    Tidak ada pemilihan utama
                                </Label>
                            </div>

                            {elections.map((election) => (
                                <div
                                    key={election.id}
                                    className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50"
                                >
                                    <RadioGroupItem
                                        value={election.id}
                                        id={`main-${election.id}`}
                                    />
                                    <Label
                                        htmlFor={`main-${election.id}`}
                                        className="font-normal cursor-pointer flex-1"
                                    >
                                        {election.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Tidak ada pemilihan yang tersedia.
                    </p>
                )}
            </CardContent>

            <CardFooter>
                <Button
                    onClick={handleSaveChanges}
                    disabled={isSubmitting}
                >
                    {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Simpan Perubahan
                </Button>
            </CardFooter>
        </Card>
    );
}
