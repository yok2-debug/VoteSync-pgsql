'use client';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type ResetSystemDialogProps = {
  action: string;
  title: string;
  description: string;
  onSuccess?: () => void;
};

const CONFIRMATION_TEXT = 'RESET';

export function ResetSystemDialog({ action, title, description, onSuccess }: ResetSystemDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Gagal melakukan aksi.');
      }

      toast({
        title: 'Aksi Berhasil',
        description: `${title} telah selesai.`,
      });
      if (onSuccess) {
        onSuccess();
      }
      setOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Aksi Gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.',
      });
    } finally {
      setIsSubmitting(false);
      setConfirmationInput('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lakukan Aksi
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Ini akan {description.toLowerCase().replace('secara permanen ', '')}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirmation">Untuk mengonfirmasi, silakan ketik "<span className="font-bold text-destructive">{CONFIRMATION_TEXT}</span>" di bawah.</Label>
          <Input
            id="confirmation"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            autoComplete="off"
            disabled={isSubmitting}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmationInput('')} disabled={isSubmitting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              await handleReset();
            }}
            disabled={confirmationInput !== CONFIRMATION_TEXT || isSubmitting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Memproses...' : 'Saya mengerti, lanjutkan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
