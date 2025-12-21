'use client';
import { useForm, useFieldArray, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Election } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, PlusCircle, Loader2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

const electionSchema = z.object({
  id: z.string(),
  name: z.string().min(3, 'Nama pemilihan minimal 3 karakter.'),
  description: z.string().optional(),
  status: z.enum(['pending', 'active']),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  useWitnesses: z.boolean().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "Tanggal & waktu akhir harus setelah tanggal & waktu mulai.",
  path: ["endDate"],
});

type ElectionFormData = z.infer<typeof electionSchema>;

interface ElectionFormProps {
  election: Omit<Election, 'allowedCategories' | 'allowedElections'>;
}

export function ElectionForm({ election }: ElectionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewElection = election.id === 'new';

  const form = useForm<ElectionFormData>({
    resolver: zodResolver(electionSchema),
    defaultValues: {
      ...election,
      status: election.status || 'pending',
      startDate: election.startDate ? new Date(election.startDate) : undefined,
      endDate: election.endDate ? new Date(election.endDate) : undefined,
      useWitnesses: election.useWitnesses || false,
    },
  });



  const onSubmit = async (data: ElectionFormData) => {
    setIsSubmitting(true);

    try {
      const { createElection, updateElection } = await import('@/app/actions/elections');

      const payload = {
        ...data,
        startDate: data.startDate?.toISOString(),
        endDate: data.endDate?.toISOString(),
        description: data.description || '',
      };

      let result;
      if (isNewElection) {
        result = await createElection(payload);
      } else {
        result = await updateElection(election.id, payload);
      }

      if (!result.success) {
        throw new Error(result.message || 'Gagal menyimpan pemilihan.');
      }

      toast({
        title: `Pemilihan ${isNewElection ? 'dibuat' : 'diperbarui'}`,
        description: `Pemilihan "${data.name}" telah berhasil disimpan.`,
      });

      // Use window.location for reliable navigation
      window.location.href = '/admin/elections';

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menyimpan pemilihan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Detail Pemilihan</CardTitle>
            <CardDescription>Berikan informasi dasar tentang pemilihan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Pemilihan</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea id="description" {...form.register('description')} />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2">
                    <FormLabel>Tanggal &amp; Waktu Mulai</FormLabel>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              const current = field.value || new Date();
                              const newDate = setMinutes(setHours(date || current, getHours(current)), getMinutes(current));
                              field.onChange(newDate);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Controller
                        name="startDate"
                        control={form.control}
                        render={({ field: timeField }) => (
                          <Select
                            value={timeField.value ? getHours(timeField.value).toString().padStart(2, '0') : '00'}
                            onValueChange={(hour) => {
                              const newDate = setHours(timeField.value || new Date(), parseInt(hour));
                              timeField.onChange(newDate);
                            }}
                            disabled={!timeField.value}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-64">
                              {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Controller
                        name="startDate"
                        control={form.control}
                        render={({ field: timeField }) => (
                          <Select
                            value={timeField.value ? getMinutes(timeField.value).toString().padStart(2, '0') : '00'}
                            onValueChange={(minute) => {
                              const newDate = setMinutes(timeField.value || new Date(), parseInt(minute));
                              timeField.onChange(newDate);
                            }}
                            disabled={!timeField.value}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-64">
                              {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2">
                    <FormLabel>Tanggal &amp; Waktu Akhir</FormLabel>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              const current = field.value || new Date();
                              const newDate = setMinutes(setHours(date || current, getHours(current)), getMinutes(current));
                              field.onChange(newDate);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Controller
                        name="endDate"
                        control={form.control}
                        render={({ field: timeField }) => (
                          <Select
                            value={timeField.value ? getHours(timeField.value).toString().padStart(2, '0') : '00'}
                            onValueChange={(hour) => {
                              const newDate = setHours(timeField.value || new Date(), parseInt(hour));
                              timeField.onChange(newDate);
                            }}
                            disabled={!timeField.value}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-64">
                              {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Controller
                        name="endDate"
                        control={form.control}
                        render={({ field: timeField }) => (
                          <Select
                            value={timeField.value ? getMinutes(timeField.value).toString().padStart(2, '0') : '00'}
                            onValueChange={(minute) => {
                              const newDate = setMinutes(timeField.value || new Date(), parseInt(minute));
                              timeField.onChange(newDate);
                            }}
                            disabled={!timeField.value}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-64">
                              {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Aktif</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.status && (
                  <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Pengaturan Laporan</Label>
                <FormField
                  control={form.control}
                  name="useWitnesses"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Pakai Saksi Calon
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/elections')} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pemilihan'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
