import { getAdminSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function ResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin-login');
  }

  if (session.roleId !== 'role_super_admin') {
    redirect('/admin/dashboard');
  }

  return children;
}
