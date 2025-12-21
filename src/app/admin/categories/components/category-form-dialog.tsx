'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import type { Category, Election } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { getElections } from '@/app/actions/elections';

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'Nama kategori minimal 3 karakter.' }),
  allowedElections: z.array(z.string()).optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSuccess: () => void;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const isEditing = !!category;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    const fetchElections = async () => {
      const result = await getElections();
      if (result.success && result.data) {
        setElections(result.data);
      }
    };
    fetchElections();
  }, []);

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({ id: category.id, name: category.name, allowedElections: category.allowedElections || [] });
      } else {
        form.reset({ id: undefined, name: '', allowedElections: [] });
      }
    }
  }, [category, form, open]);

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isEditing }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan kategori.');
      }

      toast({
        title: `Kategori ${isEditing ? 'diperbarui' : 'dibuat'}`,
        description: `"${data.name}" telah berhasil disimpan.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menyimpan kategori',
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
          <DialogTitle>{category ? 'Ubah Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
          <DialogDescription>
            {category ? 'Perbarui detail untuk kategori ini.' : 'Masukkan detail untuk kategori baru.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} id="category-form" className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nama Kategori
            </Label>
            <Input id="name" {...form.register('name')} className="w-full" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Pemilihan yang Diikuti</Label>
            <div className="space-y-2 p-3 border rounded-md max-h-48 overflow-y-auto">
              <Controller
                name="allowedElections"
                control={form.control}
                render={({ field }) => (
                  <>
                    {elections.map((election) => (
                      <div key={election.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`election-${election.id}`}
                          checked={field.value?.includes(election.id)}
                          onCheckedChange={(checked) => {
                            const newValue = checked
                              ? [...(field.value || []), election.id]
                              : (field.value || []).filter((id) => id !== election.id);
                            field.onChange(newValue);
                          }}
                        />
                        <Label htmlFor={`election-${election.id}`} className="font-normal">{election.name}</Label>
                      </div>
                    ))}
                  </>
                )}
              />
              {elections.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada pemilihan yang dibuat.</p>
              )}
            </div>
          </div>

        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="category-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
