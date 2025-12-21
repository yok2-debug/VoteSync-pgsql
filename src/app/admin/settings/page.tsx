'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { ResetSystemDialog } from './components/reset-system-dialog';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  const resetOptions = [
    {
      action: 'reset_votes_and_status',
      title: 'Atur Ulang Suara & Status Pemilih',
      description: 'Menghapus semua data suara yang masuk dan mengatur ulang status "telah memilih" untuk semua pemilih. Ini berguna jika Anda ingin melakukan simulasi atau mengulang pemungutan suara.',
    },
    {
      action: 'delete_all_voters',
      title: 'Hapus Semua Data Pemilih',
      description: 'Secara permanen menghapus semua data pemilih dari sistem. Tindakan ini tidak dapat diurungkan dan semua pemilih harus diimpor atau ditambahkan kembali.',
    },
    {
      action: 'reset_all_elections',
      title: 'Atur Ulang Semua Pemilihan',
      description: 'Menghapus semua pemilihan, kandidat, dan data terkait. Ini juga akan mengatur ulang status memilih semua pemilih dan menghapus koneksi pemilihan dari kategori.',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Sistem</h1>
        <p className="text-muted-foreground">Kelola pengaturan seluruh sistem dan lakukan operasi reset data.</p>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle>Zona Berbahaya</CardTitle>
          </div>
          <CardDescription>Tindakan di bawah ini bersifat merusak dan tidak dapat diurungkan. Lanjutkan dengan sangat hati-hati.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resetOptions.map((option) => (
            <Card key={option.action}>
              <CardHeader>
                <CardTitle className="text-lg">{option.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{option.description}</p>
              </CardContent>
              <CardFooter>
                <ResetSystemDialog
                  action={option.action}
                  title={option.title}
                  description={option.description}
                  onSuccess={() => router.refresh()}
                />
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
