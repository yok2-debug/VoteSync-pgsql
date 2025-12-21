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
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import type { AdminUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const passwordSchema = z.object({
  password: z.string().min(6, { message: 'Kata sandi baru minimal 6 karakter.' }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Kata sandi tidak cocok",
  path: ["confirmPassword"],
});


type PasswordFormData = z.infer<typeof passwordSchema>;

interface ResetUserPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser;
  onSuccess: () => void;
}

export function ResetUserPasswordDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ResetUserPasswordDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (open) {
      reset({ password: '', confirmPassword: '' });
    }
  }, [open, reset]);

  const onSubmit: SubmitHandler<PasswordFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword: data.password }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal mereset kata sandi.');
      }

      toast({
        title: 'Kata Sandi Berhasil Direset',
        description: `Kata sandi untuk ${user.username} telah diperbarui.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Mereset Kata Sandi',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reset Kata Sandi</DialogTitle>
          <DialogDescription>
            Masukkan kata sandi baru untuk <span className="font-semibold">{user.username}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} id="reset-user-password-form" className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password-reset" className="text-right">
              Kata Sandi Baru
            </Label>
            <div className="col-span-3">
              <Input id="password-reset" type="password" {...register('password')} className="w-full" />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="confirmPassword" className="text-right">
              Konfirmasi
            </Label>
            <div className="col-span-3">
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} className="w-full" />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="reset-user-password-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : 'Atur Kata Sandi Baru'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
