import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { DatabaseProvider } from '@/context/database-context';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'VoteSync - E-Voting System',
  description: 'Advanced E-Voting application built with Next.js and Supabase.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased flex flex-col')}>
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
