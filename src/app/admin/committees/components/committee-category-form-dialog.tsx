'use client';
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Committee, Election } from '@/lib/types';

interface CommitteeCategoryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    committee: Committee | null;
    onSuccess: () => void;
    elections: Election[];
}

export function CommitteeCategoryFormDialog({
    open,
    onOpenChange,
    committee,
    onSuccess,
    elections,
}: CommitteeCategoryFormDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [selectedElections, setSelectedElections] = useState<string[]>([]);

    const isEditing = !!committee;

    useEffect(() => {
        if (open) {
            setName(committee?.name || '');
            setSelectedElections(committee?.electionIds || []);
        }
    }, [open, committee]);

    const handleElectionToggle = (electionId: string) => {
        setSelectedElections(prev =>
            prev.includes(electionId)
                ? prev.filter(id => id !== electionId)
                : [...prev, electionId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast({
                variant: 'destructive',
                title: 'Nama kategori wajib diisi',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const url = '/api/committees';
            const method = isEditing ? 'PUT' : 'POST';
            const body = isEditing
                ? {
                    committeeId: committee.id,
                    data: { name, electionIds: selectedElections },
                }
                : {
                    name,
                    electionIds: selectedElections,
                    members: [],
                };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Gagal menyimpan kategori panitia.');
            }

            toast({
                title: isEditing ? 'Kategori panitia diperbarui' : 'Kategori panitia dibuat',
                description: `"${name}" telah berhasil disimpan.`,
            });

            onSuccess();
            onOpenChange(false);
            setName('');
            setSelectedElections([]);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error menyimpan kategori panitia',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Ubah Kategori Panitia' : 'Tambah Kategori Panitia'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Kategori</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: Panitia OSIS 2024"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tautkan ke Pemilihan</Label>
                            <div className="space-y-2 p-3 border rounded-md max-h-60 overflow-y-auto">
                                {elections.length > 0 ? (
                                    elections.map((election) => (
                                        <div key={election.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`election-${election.id}`}
                                                checked={selectedElections.includes(election.id)}
                                                onCheckedChange={() => handleElectionToggle(election.id)}
                                            />
                                            <Label
                                                htmlFor={`election-${election.id}`}
                                                className="font-normal cursor-pointer"
                                            >
                                                {election.name}
                                            </Label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">Belum ada pemilihan.</p>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Kategori ini akan muncul di rekapitulasi pemilihan yang dipilih.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
