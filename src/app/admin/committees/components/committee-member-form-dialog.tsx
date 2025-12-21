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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Committee, CommitteeMember } from '@/lib/types';

interface CommitteeMemberFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    committee: Committee | null;
    member: CommitteeMember | null;
    onSuccess: () => void;
}

export function CommitteeMemberFormDialog({
    open,
    onOpenChange,
    committee,
    member,
    onSuccess,
}: CommitteeMemberFormDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [role, setRole] = useState<'Ketua' | 'Anggota'>('Anggota');

    const isEditing = !!member;

    useEffect(() => {
        if (open) {
            setName(member?.name || '');
            setRole(member?.role || 'Anggota');
        }
    }, [open, member]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!committee) return;

        if (!name.trim()) {
            toast({
                variant: 'destructive',
                title: 'Nama anggota wajib diisi',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const url = '/api/committees';
            const method = isEditing ? 'PUT' : 'POST';
            const body = isEditing
                ? {
                    action: 'updateMember',
                    committeeId: committee.id,
                    memberId: member.id,
                    data: { name, role },
                }
                : {
                    action: 'addMember',
                    committeeId: committee.id,
                    member: { name, role },
                };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Gagal menyimpan anggota panitia.');
            }

            toast({
                title: isEditing ? 'Anggota panitia diperbarui' : 'Anggota panitia ditambahkan',
                description: `"${name}" telah berhasil disimpan.`,
            });

            onSuccess();
            onOpenChange(false);
            setName('');
            setRole('Anggota');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error menyimpan anggota panitia',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Ubah Anggota Panitia' : 'Tambah Anggota Panitia'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori Panitia</Label>
                            <Input
                                id="category"
                                value={committee?.name || ''}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Masukkan nama anggota panitia"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Jabatan</Label>
                            <Select value={role} onValueChange={(value) => setRole(value as 'Ketua' | 'Anggota')}>
                                <SelectTrigger id="role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Ketua">Ketua</SelectItem>
                                    <SelectItem value="Anggota">Anggota</SelectItem>
                                </SelectContent>
                            </Select>
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
