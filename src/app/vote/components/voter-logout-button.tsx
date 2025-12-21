'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteVoterSession } from '@/lib/session-client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function VoterLogoutButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Use client-side session deletion
      deleteVoterSession();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      router.push('/');
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An error occurred while logging out.',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
      <LogOut className="mr-2 h-4 w-4" />
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
}
