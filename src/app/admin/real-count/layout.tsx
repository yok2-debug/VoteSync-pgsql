import { getAdminSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function RealCountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin-login');
  }

  if (!session.permissions?.includes('real_count')) {
    redirect('/admin/dashboard');
  }

  return children;
}
