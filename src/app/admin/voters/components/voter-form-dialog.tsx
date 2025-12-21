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
import type { Voter, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const voterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'Nama minimal 3 karakter.' }),
  category: z.string().min(1, { message: 'Kategori wajib dipilih.' }),
  password: z.string().optional(),
  nik: z.string().optional(),
  birthPlace: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
  address: z.string().optional(),
});

type VoterFormData = z.infer<typeof voterSchema>;

interface VoterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voter: Voter | null;
  categories: Category[];
  onSuccess: () => Promise<void>;
}

export function VoterFormDialog({
  open,
  onOpenChange,
  voter,
  categories,
  onSuccess,
}: VoterFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!voter;
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<VoterFormData>({
    resolver: zodResolver(voterSchema),
  });

  useEffect(() => {
    if (open) {
      if (voter) {
        reset({
          ...voter,
          password: '', // Always start with empty password field for editing
        });
      } else {
        reset({
          id: '',
          name: '',
          category: '',
          password: '',
          nik: '',
          birthPlace: '',
          birthDate: '',
          gender: undefined,
          address: '',
        });
      }
    }
  }, [voter, reset, open]);

  const onSubmit: SubmitHandler<VoterFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const { createVoter, updateVoter } = await import('@/app/actions/voters');
      let result;

      if (isEditing && voter) {
        result = await updateVoter(voter.id, data);
      } else {
        result = await createVoter(data);
      }

      if (!result.success) {
        throw new Error(result.message || 'Gagal menyimpan pemilih.');
      }

      toast({
        title: `Pemilih ${isEditing ? 'diperbarui' : 'dibuat'}`,
        description: `"${data.name}" telah berhasil disimpan.`,
      });

      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menyimpan pemilih',
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
          <DialogTitle>{isEditing ? 'Ubah Pemilih' : 'Tambah Pemilih Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Perbarui detail untuk pemilih ini.' : 'Masukkan detail untuk pemilih baru.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} id="voter-form" className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
          <div className="space-y-2">
            <Label htmlFor="id">ID Pemilih</Label>
            <Input id="id" {...register('id')} className="w-full font-mono" disabled={isEditing} placeholder={isEditing ? '' : 'Otomatis jika kosong'} />
            {errors.id && <p className="text-sm text-destructive mt-1">{errors.id.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nik">NIK</Label>
            <Input id="nik" {...register('nik')} className="w-full font-mono" />
            {errors.nik && <p className="text-sm text-destructive mt-1">{errors.nik.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...register('name')} className="w-full" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthPlace">Tempat Lahir</Label>
            <Input id="birthPlace" {...register('birthPlace')} className="w-full" />
            {errors.birthPlace && <p className="text-sm text-destructive mt-1">{errors.birthPlace.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Tanggal Lahir (DD-MM-YYYY)</Label>
            <Input id="birthDate" {...register('birthDate')} className="w-full" placeholder="Contoh: 31-12-1990" />
            {errors.birthDate && <p className="text-sm text-destructive mt-1">{errors.birthDate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Jenis Kelamin</Label>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gender && <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea id="address" {...register('address')} />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sebuah kategori" />
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
            {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              className="w-full"
              placeholder={isEditing ? "Kosongkan untuk tidak mengubah" : "Otomatis jika kosong"}
            />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="voter-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
