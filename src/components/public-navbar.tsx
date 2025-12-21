'use client';
import Link from 'next/link';
import { Button } from './ui/button';
import Image from 'next/image';

export function PublicNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-[61px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-votesync.png" alt="VoteSync Logo" width={40} height={40} />
          <span className="text-xl font-bold">VoteSync</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/">Beranda</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/real-count">Real Count</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin-login">Admin Login</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
