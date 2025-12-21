'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui//button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GripVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Candidate, Election } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ReorderCandidatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allElections: Election[];
}

interface SortableItemProps {
  candidate: Candidate;
  index: number;
}

function SortableItem({ candidate, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center p-3 mb-2 bg-background border rounded-md shadow-sm"
    >
      <div {...listeners} className="cursor-grab p-2">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-shrink-0 w-10 text-center font-bold">{index + 1}</div>
      <div className="flex-grow font-medium">{candidate.name}</div>
    </div>
  );
}

export function ReorderCandidatesDialog({
  open,
  onOpenChange,
  allElections,
}: ReorderCandidatesDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (selectedElectionId) {
      const election = allElections.find((e) => e.id === selectedElectionId);
      const candidatesArray = election?.candidates
        ? Object.values(election.candidates).sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0))
        : [];
      setCandidates(candidatesArray);
    } else {
      setCandidates([]);
    }
  }, [selectedElectionId, allElections]);

  useEffect(() => {
    if (!open) {
      setSelectedElectionId(null);
      setCandidates([]);
    }
  }, [open]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCandidates((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedElectionId || candidates.length === 0) return;

    setIsSubmitting(true);
    try {
      const { reorderCandidates } = await import('@/app/actions/candidates');
      const result = await reorderCandidates(selectedElectionId, candidates);

      if (!result.success) {
        throw new Error(result.message || 'Gagal menyimpan urutan');
      }

      toast({
        title: 'Urutan berhasil disimpan',
        description: `Urutan kandidat untuk pemilihan telah diperbarui.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menyimpan urutan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Urutan Kandidat</DialogTitle>
          <DialogDescription>
            Pilih pemilihan, lalu seret dan lepas kandidat untuk mengubah nomor urut mereka.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select onValueChange={setSelectedElectionId} value={selectedElectionId || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Pemilihan" />
            </SelectTrigger>
            <SelectContent>
              {allElections.map((election) => (
                <SelectItem key={election.id} value={election.id}>
                  {election.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedElectionId && (
            <div className="max-h-[50vh] overflow-y-auto p-1">
              {candidates.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={candidates} strategy={verticalListSortingStrategy}>
                    {candidates.map((candidate, index) => (
                      <SortableItem key={candidate.id} candidate={candidate} index={index} />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                <p className="text-center text-muted-foreground p-8">Pemilihan ini belum memiliki kandidat.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSaveOrder} disabled={isSubmitting || !selectedElectionId || candidates.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan Urutan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
