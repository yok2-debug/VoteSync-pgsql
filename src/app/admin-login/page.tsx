import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AdminLoginForm } from './components/admin-login-form';
import { PublicNavbar } from '@/components/public-navbar';
import Image from 'next/image';

export default function AdminLoginPage() {
  return (
    <>
      <PublicNavbar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 pt-20">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          <div className="flex flex-col space-y-2 text-center">
             <div className="mx-auto">
                <Image src="/logo-votesync.png" alt="VoteSync Logo" width={80} height={80} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Portal Admin</h1>
            <p className="text-sm text-muted-foreground">Masukkan kredensial administrator Anda untuk melanjutkan</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Login Admin</CardTitle>
              <CardDescription>Akses dasbor manajemen.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminLoginForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
