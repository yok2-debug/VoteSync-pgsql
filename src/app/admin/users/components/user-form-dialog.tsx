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
import type { AdminUser, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const userSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3, { message: 'Username minimal 3 karakter.' }),
  password: z.string().optional(),
  roleId: z.string().min(1, { message: 'Peran harus dipilih.' }),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  roles: Role[];
  onRefresh: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  roles,
  onRefresh
}: UserFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!user;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({ id: user.id, username: user.username, roleId: user.roleId, password: '' });
      } else {
        form.reset({ id: undefined, username: '', roleId: '', password: '' });
      }
    }
  }, [user, form, open]);

  const onSubmit: SubmitHandler<UserFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isEditing }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan pengguna.');
      }

      toast({
        title: `Pengguna ${isEditing ? 'diperbarui' : 'dibuat'}`,
        description: `"${data.username}" telah berhasil disimpan.`,
      });
      onRefresh();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menyimpan pengguna',
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
          <DialogTitle>{user ? 'Ubah Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          <DialogDescription>
            {user ? 'Perbarui detail untuk pengguna ini.' : 'Masukkan detail untuk pengguna baru.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} id="user-form" className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...form.register('username')} className="w-full" disabled={user?.username === 'admin'} />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register('password')} className="w-full" placeholder={isEditing ? 'Kosongkan untuk tidak mengubah' : 'Kosongkan untuk generate otomatis'} />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Peran</Label>
            <Controller
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={user?.username === 'admin'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sebuah peran" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.roleId && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.roleId.message}</p>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="user-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
