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
import type { Role, Permission } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const ALL_PERMISSIONS: { id: Permission, label: string }[] = [
  { id: 'dashboard', label: 'Dasbor' },
  { id: 'elections', label: 'Manajemen Pemilihan' },
  { id: 'candidates', label: 'Manajemen Kandidat' },
  { id: 'voters', label: 'Manajemen Pemilih' },
  { id: 'categories', label: 'Manajemen Kategori' },
  { id: 'committees', label: 'Manajemen Panitia Pemilihan' },
  { id: 'recapitulation', label: 'Manajemen Rekapitulasi' },
  { id: 'real_count', label: 'Pengaturan Real Count' },
  { id: 'users', label: 'Manajemen Pengguna' },
  { id: 'settings', label: 'Manajemen Pengaturan' },
];

const roleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'Nama peran minimal 3 karakter.' }),
  permissions: z.array(z.string()).refine(value => value.length > 0, {
    message: "Setidaknya satu hak akses harus dipilih.",
  }),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onSuccess: () => void;
}

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!role;

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
  });

  useEffect(() => {
    if (open) {
      if (role) {
        form.reset({ id: role.id, name: role.name, permissions: role.permissions || [] });
      } else {
        form.reset({ id: undefined, name: '', permissions: [] });
      }
    }
  }, [role, form, open]);

  const onSubmit: SubmitHandler<RoleFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isEditing }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan peran.');
      }

      toast({
        title: `Peran ${isEditing ? 'diperbarui' : 'dibuat'}`,
        description: `"${data.name}" telah berhasil disimpan.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menyimpan peran',
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
          <DialogTitle>{role ? 'Ubah Peran' : 'Tambah Peran Baru'}</DialogTitle>
          <DialogDescription>
            {role ? 'Perbarui detail untuk peran ini.' : 'Masukkan detail untuk peran baru.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} id="role-form" className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nama Peran
            </Label>
            <Input id="name" {...form.register('name')} className="w-full" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Hak Akses</Label>
            <Controller
              name="permissions"
              control={form.control}
              render={({ field }) => (
                <div className="space-y-2 p-3 border rounded-md max-h-60 overflow-y-auto">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="permission-all"
                      checked={field.value?.length === ALL_PERMISSIONS.length}
                      onCheckedChange={(checked) => {
                        const allIds = ALL_PERMISSIONS.map(p => p.id);
                        field.onChange(checked ? allIds : []);
                      }}
                    />
                    <Label htmlFor="permission-all" className="font-semibold">Pilih Semua</Label>
                  </div>
                  <hr className="my-2" />
                  {ALL_PERMISSIONS.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`permission-${permission.id}`}
                        checked={field.value?.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          const newValue = checked
                            ? [...(field.value || []), permission.id]
                            : (field.value || []).filter((id) => id !== permission.id);
                          field.onChange(newValue);
                        }}
                      />
                      <Label htmlFor={`permission-${permission.id}`} className="font-normal capitalize">{permission.label}</Label>
                    </div>
                  ))}
                </div>
              )}
            />
            {form.formState.errors.permissions && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.permissions.message}</p>
            )}
          </div>

        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="role-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
