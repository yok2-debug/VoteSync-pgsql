import { AdminSidebar } from '@/components/admin-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { getAdminSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  // No valid session - redirect to login
  // This is the primary authentication check after proxy.ts does basic cookie check
  if (!session) {
    redirect('/admin-login');
  }

  // Permission checking is handled by:
  // 1. AdminSidebar - filters menu items based on session.permissions
  // 2. Server Actions - verifyAdminSession() checks specific permissions
  // This provides defense-in-depth without relying on proxy layer

  return (
    <SidebarProvider>
      <AdminSidebar session={session} />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:justify-end no-print">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <h1 className="text-lg font-semibold md:hidden">VoteSync Admin</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
