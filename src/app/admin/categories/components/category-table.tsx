'use client';
import { useState, useMemo, useEffect } from 'react';
import type { Category, Election } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { CategoryFormDialog } from './category-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getElections } from '@/app/actions/elections';

type CategoryTableProps = {
  categories: Category[];
  refreshCategories: () => void;
};

export function CategoryTable({ categories, refreshCategories }: CategoryTableProps) {
  const [filter, setFilter] = useState('');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const [elections, setElections] = useState<Election[]>([]);

  useEffect(() => {
    const fetchElections = async () => {
      const result = await getElections();
      if (result.success && result.data) {
        setElections(result.data);
      }
    };
    fetchElections();
  }, []);

  const electionMap = useMemo(() => new Map(elections.map((e) => [e.id, e.name])), [elections]);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleAdd = () => {
    setSelectedCategory(null);
    setShowFormDialog(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setShowFormDialog(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedCategory) return;
    setIsDeleting(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selectedCategory.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menghapus kategori.');
      }

      toast({ title: 'Kategori berhasil dihapus.' });
      refreshCategories();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus kategori',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedCategory(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Saring kategori..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Kategori</TableHead>
              <TableHead>Pemilihan yang Diikuti</TableHead>
              <TableHead className="w-[100px] text-right">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {category.allowedElections && category.allowedElections.length > 0 ? (
                        (() => {
                          const validElections = category.allowedElections.filter(id => electionMap.has(id));
                          return validElections.length > 0 ? (
                            validElections.map(electionId => (
                              <Badge key={electionId} variant="secondary">
                                {electionMap.get(electionId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Tidak ada</span>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-muted-foreground">Tidak ada</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(category)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Ubah
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(category)}>
                          <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                          <span className="text-destructive">Hapus</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Tidak ada kategori ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        category={selectedCategory}
        onSuccess={refreshCategories}
      />


      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus kategori secara permanen
              "{selectedCategory?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
