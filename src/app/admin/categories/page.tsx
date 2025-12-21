'use client';
import { useState, useEffect, useCallback } from 'react';
import { CategoryTable } from './components/category-table';
import Loading from '@/app/loading';
import { getCategories } from '@/app/actions/categories';
import type { Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCategories();
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal memuat kategori',
          description: result.message
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal memuat data kategori'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manajemen Kategori Pemilih</h1>
        <p className="text-muted-foreground">
          Kelola kategori pemilih untuk pemilihan.
        </p>
      </div>
      <CategoryTable categories={categories} refreshCategories={fetchCategories} />
    </div>
  );
}
