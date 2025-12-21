'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import {
  Box,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  Settings,
  Users,
  Vote,
  User,
  Shield,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getAdminSession, deleteAdminSession } from '@/lib/session-client';
import { useState, useMemo } from 'react';
import type { AdminSessionPayload } from '@/lib/types';
import { logoutAdmin } from '@/lib/session';
import { useDatabase } from '@/context/database-context';
import Image from 'next/image';

export function AdminSidebar({ session }: { session: AdminSessionPayload | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const avatar = PlaceHolderImages.find(p => p.id === 'default-avatar');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { roles } = useDatabase();

  // Session is now passed from server, so no loading state needed for session
  // But we might want to keep isLoading if roles are loading? 
  // Actually, roles come from context which handles its own loading.
  // We can just check if session exists.

  const currentUserRole = useMemo(() => {
    return session?.roleName || 'User Role';
  }, [session]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAdmin(); // Deletes server session cookie
    await deleteAdminSession(); // Deletes client localStorage session
    router.push('/admin-login');
    router.refresh();
    setIsLoggingOut(false);
  };

  const hasPermission = (permission: string) => !!session?.permissions?.includes(permission as any);

  const menuItems = [
    { href: '/admin/dashboard', icon: <Home />, label: 'Dasbor', permission: 'dashboard' },
    { href: '/admin/elections', icon: <Vote />, label: 'Pemilihan', permission: 'elections' },
    { href: '/admin/categories', icon: <Box />, label: 'Kategori Pemilih', permission: 'categories' },
    { href: '/admin/voters', icon: <Users />, label: 'Pemilih', permission: 'voters' },
    { href: '/admin/candidates', icon: <Users />, label: 'Kandidat', permission: 'candidates' },
    { href: '/admin/committees', icon: <Users />, label: 'Panitia Pemilihan', permission: 'committees' },
    { href: '/admin/recapitulation', icon: <FileText />, label: 'Rekapitulasi', permission: 'recapitulation' },
    { href: '/admin/real-count', icon: <TrendingUp />, label: 'Real Count', permission: 'real_count' },
  ];

  const userManagementItems = [
    { href: '/admin/users', icon: <User />, label: 'Pengguna', permission: 'users' },
    { href: '/admin/users/roles', icon: <Shield />, label: 'Peran', permission: 'users' },
  ]

  const settingsItem = { href: '/admin/settings', icon: <Settings />, label: 'Pengaturan', permission: 'settings' };

  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center">
        <div className="flex items-center gap-2">
          <Image src="/logo-votesync.png" alt="VoteSync Logo" width={40} height={40} />
          <span className="text-lg font-semibold">VoteSync</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <>
            {menuItems.filter(item => hasPermission(item.permission)).map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  onClick={() => router.push(item.href)}
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {hasPermission('users') && (
              <SidebarGroup>
                <SidebarGroupLabel>Manajemen Pengguna</SidebarGroupLabel>
                {userManagementItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      onClick={() => router.push(item.href)}
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.label}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
            )}

            {hasPermission(settingsItem.permission) && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push(settingsItem.href)}
                  isActive={pathname.startsWith(settingsItem.href)}
                  tooltip={settingsItem.label}
                >
                  {settingsItem.icon}
                  <span>{settingsItem.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-12 w-full items-center justify-start gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatar?.imageUrl} alt="Admin" />
                <AvatarFallback>{session?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{session?.username || 'User'}</span>
                <span className="text-xs text-muted-foreground">{currentUserRole}</span>
              </div>
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
            <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/admin/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-500/10" disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
