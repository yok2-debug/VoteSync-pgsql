'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Permission } from '@/lib/types';
import { loginAdmin } from '@/app/actions/auth';
import { setAdminSession } from '@/lib/session-client';

const adminLoginSchema = z.object({
  username: z.string().min(1, { message: 'Username is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

// Urutan prioritas halaman tujuan setelah login
const permissionRedirectOrder: { permission: Permission; path: string }[] = [
  { permission: 'dashboard', path: '/admin/dashboard' },
  { permission: 'recapitulation', path: '/admin/recapitulation' },
  { permission: 'elections', path: '/admin/elections' },
  { permission: 'candidates', path: '/admin/candidates' },
  { permission: 'voters', path: '/admin/voters' },
  { permission: 'categories', path: '/admin/categories' },
  { permission: 'users', path: '/admin/users' },
  { permission: 'settings', path: '/admin/settings' },
];

function getRedirectPath(permissions: Permission[]): string | null {
  if (!permissions || permissions.length === 0) {
    return null;
  }
  for (const route of permissionRedirectOrder) {
    if (permissions.includes(route.permission)) {
      return route.path;
    }
  }
  return null; // Tidak ada rute yang cocok ditemukan
}


export function AdminLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof adminLoginSchema>>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function handleAdminLogin(values: z.infer<typeof adminLoginSchema>) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('username', values.username);
      formData.append('password', values.password);

      const result = await loginAdmin(null, formData);

      if (!result.success || !result.payload || !result.permissions) {
        throw new Error(result.message || 'Login gagal.');
      }

      // Simpan salinan ke localStorage untuk akses sisi klien
      await setAdminSession(result.payload);

      // Small delay to ensure localStorage write completes
      await new Promise(resolve => setTimeout(resolve, 100));

      const redirectPath = getRedirectPath(result.permissions);

      if (!redirectPath) {
        throw new Error('Tidak ada halaman yang dapat diakses ditemukan untuk peran Anda.');
      }

      toast({
        title: 'Login Berhasil',
        description: 'Mengarahkan ke halaman Anda...',
      });

      // Use window.location for a hard navigation to ensure fresh page load
      window.location.href = redirectPath;

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleAdminLogin)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="username" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} disabled={isSubmitting} />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Masuk...' : 'Login as Admin'}
        </Button>
      </form>
    </Form>
  );
}
