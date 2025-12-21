'use client';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import type { Candidate, Voter, Election, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { VoterSearchDialog } from './voter-search-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const candidateSchema = z.object({
  id: z.string().optional(),
  electionId: z.string().min(1, { message: 'Pemilihan harus dipilih.' }),
  voterId: z.string().optional(), // Optional - only set when selected from voter search
  name: z.string().min(1, { message: 'Nama kandidat utama wajib diisi.' }),
  viceCandidateId: z.string().optional(),
  viceCandidateName: z.string().optional(),
  vision: z.string().optional(),
  mission: z.string().optional(),
  orderNumber: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number({ invalid_type_error: 'Nomor urut harus berupa angka' }).positive('Nomor urut harus angka positif').optional()
  ),
  photo: z.string().optional(),
}).refine(data => !data.viceCandidateId || data.voterId !== data.viceCandidateId, {
  message: "Kandidat utama dan wakil tidak boleh orang yang sama.",
  path: ["viceCandidateId"],
});


type CandidateFormData = z.infer<typeof candidateSchema>;

interface CandidateFormProps {
  initialData: (Candidate & { voterId?: string, electionId?: string }) | null;
  allElections: Election[];
  categories: Category[];
}

export function CandidateForm({
  initialData,
  allElections,
  categories,
}: CandidateFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchDialog, setSearchDialog] = useState<{ open: boolean, target: 'main' | 'vice' | null }>({ open: false, target: null });
  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoadingVoters, setIsLoadingVoters] = useState(true);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
    defaultValues: initialData ? {
      ...initialData,
      electionId: initialData.electionId || '',
      voterId: initialData.voterId || initialData.id || '',
    } : {
      electionId: '',
      name: '',
      voterId: '',
      viceCandidateName: '',
      viceCandidateId: '',
      vision: '',
      mission: '',
      orderNumber: undefined,
      photo: '',
    },
  });

  const selectedElectionId = watch('electionId');

  // Fetch voters on mount
  useEffect(() => {
    const fetchVoters = async () => {
      const { getVoters } = await import('@/app/actions/voters');
      const result = await getVoters();
      if (result.success && result.data) {
        setVoters(result.data);
      }
      setIsLoadingVoters(false);
    };
    fetchVoters();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        electionId: initialData.electionId || '', // Explicitly set electionId
        voterId: initialData.voterId || initialData.id,
      });
    } else {
      reset({ electionId: '', name: '', voterId: '', viceCandidateName: '', viceCandidateId: '', vision: '', mission: '', orderNumber: undefined, photo: '' });
    }
  }, [initialData, reset]);

  const handleVoterSelect = (voter: Voter) => {
    if (searchDialog.target === 'main') {
      setValue('voterId', voter.id, { shouldValidate: true });
      setValue('name', voter.name, { shouldValidate: true });
    } else if (searchDialog.target === 'vice') {
      setValue('viceCandidateId', voter.id, { shouldValidate: true });
      setValue('viceCandidateName', voter.name, { shouldValidate: true });
    }
    setSearchDialog({ open: false, target: null });
  };


  const onSubmit = async (data: CandidateFormData) => {
    setIsSubmitting(true);
    try {
      const { createCandidate, updateCandidate } = await import('@/app/actions/candidates');

      let result;
      if (isEditing && initialData) {
        // Update existing candidate
        result = await updateCandidate(
          initialData.electionId || '', // Original Election ID
          initialData.id,
          {
            ...data,
            electionId: data.electionId // Pass new election ID for transfer logic
          }
        );
      } else {
        // Create new candidate
        const { electionId, ...candidateData } = data;
        result = await createCandidate(electionId, {
          ...candidateData,
          voterId: candidateData.voterId // Ensure voterId is passed
        });
      }

      if (!result.success) {
        throw new Error(result.message || 'Gagal menyimpan kandidat.');
      }

      toast({
        title: `Kandidat ${isEditing ? 'diperbarui' : 'dibuat'}`,
        description: `"${data.name}" telah berhasil disimpan.`,
      });

      router.push(`/admin/candidates`);
      router.refresh();

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menyimpan kandidat',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-full">
              <Label htmlFor="electionId">Pemilihan</Label>
              <Controller
                control={control}
                name="electionId"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pemilihan untuk kandidat..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allElections.map((election) => (
                        <SelectItem key={election.id} value={election.id}>
                          {election.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.electionId && <p className="text-sm text-destructive mt-1">{errors.electionId.message}</p>}
            </div>

            <div className="space-y-2 col-span-1">
              <Label htmlFor="name">Nama Calon Utama</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  {...register('name', {
                    onChange: () => {
                      // Clear voterId when name is manually edited
                      setValue('voterId', '', { shouldValidate: false });
                    }
                  })}
                  placeholder="Ketik nama atau cari pemilih..."
                  disabled={!selectedElectionId}
                />
                <Button type="button" variant="outline" onClick={() => setSearchDialog({ open: true, target: 'main' })} disabled={!selectedElectionId}>
                  <Search className="mr-2 h-4 w-4" />
                  Cari
                </Button>
              </div>
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2 col-span-1">
              <Label htmlFor="viceCandidateName">Nama Calon Wakil (Opsional)</Label>
              <div className="flex gap-2">
                <Input
                  id="viceCandidateName"
                  {...register('viceCandidateName', {
                    onChange: () => {
                      // Clear viceCandidateId when name is manually edited
                      setValue('viceCandidateId', '', { shouldValidate: false });
                    }
                  })}
                  placeholder="Ketik nama atau cari pemilih..."
                  disabled={!selectedElectionId}
                />
                <Button type="button" variant="outline" onClick={() => setSearchDialog({ open: true, target: 'vice' })} disabled={!selectedElectionId}>
                  <Search className="mr-2 h-4 w-4" />
                  Cari
                </Button>
              </div>
              {errors.viceCandidateId && (
                <p className="text-sm text-destructive mt-1">{errors.viceCandidateId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Nomor Urut (Opsional)</Label>
              <Input id="orderNumber" type="number" {...register('orderNumber')} disabled={!selectedElectionId} placeholder="Otomatis jika kosong" />
              {errors.orderNumber && (
                <p className="text-sm text-destructive mt-1">{errors.orderNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">URL Foto (Opsional)</Label>
              <Input id="photo" {...register('photo')} placeholder="https://example.com/photo.jpg" disabled={!selectedElectionId} />
            </div>
            <div className="space-y-2 col-span-full">
              <Label htmlFor="vision">Visi</Label>
              <Controller
                name="vision"
                control={control}
                render={({ field }) => <MarkdownEditor {...field} value={field.value ?? ''} />}
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label htmlFor="mission">Misi</Label>
              <Controller
                name="mission"
                control={control}
                render={({ field }) => <MarkdownEditor {...field} value={field.value ?? ''} />}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => router.push(`/admin/candidates`)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan Kandidat'}
          </Button>
        </div>
      </form>

      <VoterSearchDialog
        open={searchDialog.open}
        onOpenChange={(isOpen) => setSearchDialog({ open: isOpen, target: null })}
        onVoterSelect={handleVoterSelect}
        voters={voters}
        categories={categories}
      />
    </>
  );
}
