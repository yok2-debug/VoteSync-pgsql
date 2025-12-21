'use client';
import Loading from '@/app/loading';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CommitteeCategoryFormDialog } from './components/committee-category-form-dialog';
import { CommitteeMemberFormDialog } from './components/committee-member-form-dialog';
import type { Committee, CommitteeMember, Election } from '@/lib/types';
import { getCommittees } from '@/app/actions/committees';
import { getElections } from '@/app/actions/elections';

export default function CommitteesPage() {
    const { toast } = useToast();

    const [committees, setCommittees] = useState<Committee[]>([]);
    const [elections, setElections] = useState<Election[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [showMemberDialog, setShowMemberDialog] = useState(false);
    const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
    const [showDeleteMemberDialog, setShowDeleteMemberDialog] = useState(false);

    const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
    const [selectedMember, setSelectedMember] = useState<CommitteeMember | null>(null);

    const [isDeletingCategory, setIsDeletingCategory] = useState(false);
    const [isDeletingMember, setIsDeletingMember] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [committeesRes, electionsRes] = await Promise.all([
                getCommittees(),
                getElections()
            ]);

            if (committeesRes.success && committeesRes.data) {
                setCommittees(committeesRes.data);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Gagal memuat data panitia',
                    description: committeesRes.message || 'Terjadi kesalahan saat memuat data panitia.',
                });
            }

            if (electionsRes.success && electionsRes.data) {
                setElections(electionsRes.data);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Gagal memuat data pemilihan',
                    description: electionsRes.message || 'Terjadi kesalahan saat memuat data pemilihan.',
                });
            }

        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Gagal terhubung ke server.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddCategory = () => {
        setSelectedCommittee(null);
        setShowCategoryDialog(true);
    };

    const handleEditCategory = (committee: Committee) => {
        setSelectedCommittee(committee);
        setShowCategoryDialog(true);
    };

    const handleDeleteCategory = (committee: Committee) => {
        setSelectedCommittee(committee);
        setShowDeleteCategoryDialog(true);
    };

    const handleAddMember = (committee: Committee) => {
        setSelectedCommittee(committee);
        setSelectedMember(null);
        setShowMemberDialog(true);
    };

    const handleEditMember = (committee: Committee, member: CommitteeMember) => {
        setSelectedCommittee(committee);
        setSelectedMember(member);
        setShowMemberDialog(true);
    };

    const handleDeleteMember = (committee: Committee, member: CommitteeMember) => {
        setSelectedCommittee(committee);
        setSelectedMember(member);
        setShowDeleteMemberDialog(true);
    };

    const confirmDeleteCategory = async () => {
        if (!selectedCommittee) return;

        setIsDeletingCategory(true);
        try {
            const response = await fetch('/api/committees', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ committeeId: selectedCommittee.id }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Gagal menghapus kategori panitia.');
            }

            toast({ title: 'Kategori panitia berhasil dihapus.' });
            fetchData();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal menghapus kategori panitia',
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setIsDeletingCategory(false);
            setShowDeleteCategoryDialog(false);
            setSelectedCommittee(null);
        }
    };

    const confirmDeleteMember = async () => {
        if (!selectedCommittee || !selectedMember) return;

        setIsDeletingMember(true);
        try {
            const response = await fetch('/api/committees', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteMember',
                    committeeId: selectedCommittee.id,
                    memberId: selectedMember.id,
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Gagal menghapus anggota panitia.');
            }

            toast({ title: 'Anggota panitia berhasil dihapus.' });
            fetchData();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal menghapus anggota panitia',
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setIsDeletingMember(false);
            setShowDeleteMemberDialog(false);
            setSelectedCommittee(null);
            setSelectedMember(null);
        }
    };

    const getElectionNames = (electionIds: string[]) => {
        return electionIds
            .map(id => elections.find(e => e.id === id)?.name)
            .filter(Boolean)
            .join(', ');
    };

    if (isLoading) {
        return <Loading />;
    }

    return (
        <>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Panitia Pemilihan</h1>
                        <p className="text-muted-foreground">
                            Kelola kategori panitia dan anggotanya. Kategori dapat ditautkan ke beberapa pemilihan.
                        </p>
                    </div>
                    <Button onClick={handleAddCategory}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Kategori Panitia
                    </Button>
                </div>

                <div className="space-y-6">
                    {committees.length > 0 ? (
                        committees.map((committee) => {
                            const members = committee.members || [];
                            const linkedElections = getElectionNames(committee.electionIds);

                            return (
                                <Card key={committee.id}>
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                                        <div className="space-y-2">
                                            <CardTitle>{committee.name}</CardTitle>
                                            <div className="flex flex-wrap gap-2">
                                                {committee.electionIds.length > 0 ? (
                                                    committee.electionIds.map(electionId => {
                                                        const election = elections.find(e => e.id === electionId);
                                                        return election ? (
                                                            <Badge key={electionId} variant="secondary">
                                                                {election.name}
                                                            </Badge>
                                                        ) : null;
                                                    })
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Belum ditautkan ke pemilihan</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {members.length} anggota panitia
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEditCategory(committee)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Kategori
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteCategory(committee)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold">Anggota Panitia</h4>
                                                <Button size="sm" variant="outline" onClick={() => handleAddMember(committee)}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Tambah Anggota
                                                </Button>
                                            </div>
                                            {members.length > 0 ? (
                                                <div className="space-y-2">
                                                    {members.map((member) => (
                                                        <div
                                                            key={member.id}
                                                            className="flex items-center justify-between p-3 border rounded-lg"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-medium">{member.name}</span>
                                                                <Badge variant={member.role === 'Ketua' ? 'default' : 'secondary'}>
                                                                    {member.role}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEditMember(committee, member)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteMember(committee, member)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                                                    Belum ada anggota panitia. Klik "Tambah Anggota" untuk menambahkan.
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        <Card>
                            <CardContent className="py-12">
                                <p className="text-center text-muted-foreground">
                                    Belum ada kategori panitia. Klik "Tambah Kategori Panitia" untuk membuat.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <CommitteeCategoryFormDialog
                open={showCategoryDialog}
                onOpenChange={setShowCategoryDialog}
                committee={selectedCommittee}
                onSuccess={fetchData}
                elections={elections}
            />

            <CommitteeMemberFormDialog
                open={showMemberDialog}
                onOpenChange={setShowMemberDialog}
                committee={selectedCommittee}
                member={selectedMember}
                onSuccess={fetchData}
            />

            <AlertDialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus kategori panitia "
                            {selectedCommittee?.name}" beserta semua anggotanya.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteCategory}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeletingCategory}
                        >
                            {isDeletingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteMemberDialog} onOpenChange={setShowDeleteMemberDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus anggota panitia "
                            {selectedMember?.name}" dari kategori "{selectedCommittee?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteMember}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeletingMember}
                        >
                            {isDeletingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
