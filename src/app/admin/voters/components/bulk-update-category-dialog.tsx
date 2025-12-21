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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import type { Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const bulkUpdateSchema = z.object({
  categoryId: z.string().min(1, { message: 'Kategori harus dipilih.' }),
});

type BulkUpdateFormData = z.infer<typeof bulkUpdateSchema>;

interface BulkUpdateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVoterIds: string[];
  categories: Category[];
  onSuccess: () => void;
}

export function BulkUpdateCategoryDialog({
  open,
  onOpenChange,
  selectedVoterIds,
  categories,
  onSuccess,
}: BulkUpdateCategoryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const numSelected = selectedVoterIds.length;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkUpdateFormData>({
    resolver: zodResolver(bulkUpdateSchema),
  });

  const onSubmit = async (data: BulkUpdateFormData) => {
    setIsSubmitting(true);
    try {
      const { bulkUpdateVoterCategory } = await import('@/app/actions/voters');
      const result = await bulkUpdateVoterCategory(selectedVoterIds, data.categoryId);

      if (!result.success) {
        throw new Error(result.message || 'Gagal memperbarui kategori.');
      }

      toast({
        title: 'Pembaruan Berhasil',
        description: `${numSelected} pemilih telah dipindahkan ke kategori baru.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Memperbarui Pemilih',
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
          <DialogTitle>Perbarui Kategori Pemilih Massal</DialogTitle>
          <DialogDescription>
            Ubah kategori untuk {numSelected} pemilih yang dipilih.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} id="bulk-update-form" className="space-y-4 py-4">
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori baru" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="bulk-update-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Memperbarui...' : `Perbarui ${numSelected} Pemilih`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
