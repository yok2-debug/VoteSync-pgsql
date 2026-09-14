import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { DatabaseProvider } from '@/context/database-context';
import { Footer } from '@/components/footer';

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
      <body className="min-h-screen bg-background font-body antialiased flex flex-col">
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
