'use client';

import { ChangePasswordForm } from './components/change-password-form';

export default function AdminProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profil Admin</h1>
        <p className="text-muted-foreground">
          Kelola detail akun administrator Anda.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
