'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Category, Voter } from '@/lib/types';

interface VoterImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[];
  categories: Category[];
  existingVoters: Voter[];
  onSuccess: () => Promise<void>;
}

type ValidatedRow = {
  data: any;
  isValid: boolean;
  errors: string[];
};

// Helper function to normalize category names for robust matching
const normalizeCategory = (name: string) => name ? name.replace(/\s+/g, '').toLowerCase() : '';


export function VoterImportDialog({ open, onOpenChange, data, categories, existingVoters, onSuccess }: VoterImportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);
  const { toast } = useToast();

  const categoryNameMap = useMemo(() => new Map(categories.map(c => [normalizeCategory(c.name), c.id])), [categories]);

  useEffect(() => {
    function validateData() {
      const filteredData = data.filter(row => row && typeof row === 'object' && Object.values(row as object).some(val => val !== null && val !== ''));

      if (!open || filteredData.length === 0) {
        setValidatedData([]);
        return;
      }

      const existingVoterIds = new Set(existingVoters.map(v => v.id));
      const currentImportIds = new Set();


      const validated = filteredData.map(row => {
        const errors: string[] = [];

        const typedRow = row as Record<string, unknown>;

        let gender = typeof typedRow.gender === 'string' ? typedRow.gender.trim() : '';
        if (gender.toUpperCase() === 'L') {
          gender = 'Laki-laki';
        } else if (gender.toUpperCase() === 'P') {
          gender = 'Perempuan';
        }

        let id = typedRow.id ? String(typedRow.id).trim() : '';
        if (!id) {
          const chars = 'ABCDEFGHJKMNPQRTUVWXY';
          const generateId = () => {
            let letters = '';
            for (let i = 0; i < 2; i++) {
              letters += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const number = Math.floor(100000 + Math.random() * 900000);
            return `${letters}-${number}`;
          };

          id = generateId();
          let attempts = 0;
          while ((existingVoterIds.has(id) || currentImportIds.has(id)) && attempts < 10) {
            id = generateId();
            attempts++;
          }
        }

        const cleanRow = {
          id: id,
          nik: typedRow.nik ? String(typedRow.nik).trim() : '',
          name: typeof typedRow.name === 'string' ? typedRow.name.trim() : '',
          birthPlace: typeof typedRow.birthPlace === 'string' ? typedRow.birthPlace.trim() : '',
          birthDate: typeof typedRow.birthDate === 'string' ? typedRow.birthDate.trim() : '',
          gender: gender,
          address: typeof typedRow.address === 'string' ? typedRow.address.trim() : '',
          category: typeof typedRow.category === 'string' ? typedRow.category.trim() : '',
          password: typedRow.password ? String(typedRow.password).trim() : ''
        };

        if (existingVoterIds.has(cleanRow.id)) {
          errors.push(`ID '${cleanRow.id}' sudah ada di database.`);
        } else if (currentImportIds.has(cleanRow.id)) {
          errors.push(`ID duplikat '${cleanRow.id}' di dalam file impor ini.`);
        } else {
          currentImportIds.add(cleanRow.id);
        }

        if (!cleanRow.name) {
          errors.push('Nama tidak boleh kosong.');
        }

        if (!cleanRow.category || !categoryNameMap.has(normalizeCategory(cleanRow.category))) {
          errors.push(`Kategori '${cleanRow.category}' tidak valid atau tidak ada.`);
        }

        if (cleanRow.gender && !['Laki-laki', 'Perempuan'].includes(cleanRow.gender)) {
          errors.push(`Jenis kelamin tidak valid: '${typedRow.gender}'. Harus 'L', 'P', 'Laki-laki', atau 'Perempuan'.`);
        }

        return {
          data: cleanRow,
          isValid: errors.length === 0,
          errors
        };
      });
      setValidatedData(validated);
    }
    validateData();

  }, [data, open, categoryNameMap, existingVoters]);

  const hasErrors = useMemo(() => validatedData.some(row => !row.isValid), [validatedData]);
  const validRowCount = useMemo(() => validatedData.filter(row => row.isValid).length, [validatedData]);
  const invalidRowCount = useMemo(() => validatedData.length - validRowCount, [validatedData, validRowCount]);


  const handleConfirmImport = async () => {
    setIsSubmitting(true);
    const dataToImport = validatedData
      .filter(row => row.isValid)
      .map(row => row.data);

    try {
      const { importVoters } = await import('@/app/actions/voters');
      const result = await importVoters(dataToImport);

      if (!result.success) {
        if (result.errors && result.errors.length > 0) {
          throw new Error(`Impor gagal: ${result.errors.join(', ')}`);
        }
        throw new Error(result.message || 'Gagal mengimpor data.');
      }

      toast({
        title: 'Impor Berhasil',
        description: `${dataToImport.length} pemilih berhasil diimpor.`,
      });
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Impor Gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui saat impor.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Impor Pemilih dari CSV</DialogTitle>
          <DialogDescription>
            Tinjau data di bawah ini sebelum mengimpor. Baris dengan error akan dilewati.
          </DialogDescription>
        </DialogHeader>

        {invalidRowCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">{invalidRowCount} baris memiliki error dan tidak akan diimpor. Harap perbaiki CSV dan coba lagi atau lanjutkan dengan baris yang valid.</p>
          </div>
        )}

        <ScrollArea className="h-[50vh] mt-4">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validatedData.map((row, index) => (
                <TableRow key={`import-row-${index}`} className={!row.isValid ? 'bg-destructive/10' : ''}>
                  <TableCell>
                    {row.isValid ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Valid</Badge>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {row.errors.map((err, i) => (
                          <Badge key={i} variant="destructive">{err}</Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{row.data.id}</TableCell>
                  <TableCell>{row.data.nik}</TableCell>
                  <TableCell>{row.data.name}</TableCell>
                  <TableCell>{row.data.category}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.data.birthPlace}, {row.data.birthDate} <br />
                    {row.data.gender} <br />
                    {row.data.address}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleConfirmImport} disabled={isSubmitting || validRowCount === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengimpor...
              </>
            ) : (
              `Impor ${validRowCount} Pemilih Valid`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
