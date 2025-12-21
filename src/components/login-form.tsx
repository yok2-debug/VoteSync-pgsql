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
import { setVoterSession } from '@/lib/session-client';
import { loginVoter } from '@/app/actions/auth';

const voterLoginSchema = z.object({
  voterId: z.string().min(1, { message: 'ID Pemilih wajib diisi.' }),
  password: z.string().min(1, { message: 'Password wajib diisi.' }),
});

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof voterLoginSchema>>({
    resolver: zodResolver(voterLoginSchema),
    defaultValues: { voterId: '', password: '' },
  });

  async function handleVoterLogin(values: z.infer<typeof voterLoginSchema>) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('voterId', values.voterId);
      formData.append('password', values.password);

      const result = await loginVoter(null, formData);

      if (!result.success || !result.voterId) {
        throw new Error(result.message || 'Login gagal.');
      }

      setVoterSession({ voterId: result.voterId });

      toast({
        title: 'Login Berhasil',
        description: 'Mengarahkan ke dasbor Anda...',
      });

      router.push('/vote');
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
      <form onSubmit={form.handleSubmit(handleVoterLogin)} className="space-y-4">
        <FormField
          control={form.control}
          name="voterId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID Pemilih</FormLabel>
              <FormControl>
                <Input placeholder="ID Pemilih Anda" {...field} disabled={isSubmitting} />
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
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Password Anda" {...field} disabled={isSubmitting} />
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
          {isSubmitting ? 'Masuk...' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
