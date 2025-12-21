'use client';
import { useState, useMemo } from 'react';
import type { Voter, Category } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VoterSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoterSelect: (voter: Voter) => void;
  voters: Voter[];
  categories: Category[];
}

export function VoterSearchDialog({
  open,
  onOpenChange,
  onVoterSelect,
  voters,
  categories,
}: VoterSearchDialogProps) {
  const [filter, setFilter] = useState('');

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filteredVoters = useMemo(() => {
    if (!filter) return voters;
    return voters.filter(
      (voter) =>
        voter.name.toLowerCase().includes(filter.toLowerCase()) ||
        voter.id.toLowerCase().includes(filter.toLowerCase()) ||
        (voter.nik && voter.nik.includes(filter))
    );
  }, [voters, filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cari dan Pilih Pemilih</DialogTitle>
          <DialogDescription>
            Cari pemilih berdasarkan ID, NIK, atau nama untuk dijadikan kandidat.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            placeholder="Saring pemilih..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full"
          />
          <ScrollArea className="h-[50vh] border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>ID Pemilih</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVoters.length > 0 ? (
                  filteredVoters.map((voter) => (
                    <TableRow key={voter.id}>
                      <TableCell className="font-mono">{voter.id}</TableCell>
                      <TableCell className="font-mono">{voter.nik || 'N/A'}</TableCell>
                      <TableCell>{voter.name}</TableCell>
                      <TableCell>{categoryMap.get(voter.category) || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => onVoterSelect(voter)}>
                          Pilih
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Tidak ada pemilih ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
