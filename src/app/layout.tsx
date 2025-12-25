import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { DatabaseProvider } from '@/context/database-context';
import { Footer } from '@/components/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VoteSync - E-Voting System',
  description: 'Advanced E-Voting application built with Next.js and Postgresql.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-body antialiased flex flex-col', inter.className)}>
        <DatabaseProvider>
          <div className="flex-grow">
            {children}
          </div>
        </DatabaseProvider>
        <Toaster />
        <Footer />
      </body>
    </html>
  );
}
