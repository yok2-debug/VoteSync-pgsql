'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Election, Voter, Category, Role } from '@/lib/types';
import { initializeDefaultAdmin } from '@/lib/data';

interface DatabaseContextType {
  elections: Election[];
  voters: Voter[];
  categories: Category[];
  roles: Role[];
  isLoading: boolean;
  refreshData: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState({
    elections: [] as Election[],
    voters: [] as Voter[],
    categories: [] as Category[],
    roles: [] as Role[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    setIsLoading(true);

    // Initialize default admin on first load
    initializeDefaultAdmin();

    // With Supabase, we don't need real-time listeners for client-side
    // Data is fetched via Server Actions when needed
    // This context now just provides a loading state and refresh trigger

    const timeout = setTimeout(() => setIsLoading(false), 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [refreshKey]);

  const value = { ...data, isLoading, refreshData };

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
