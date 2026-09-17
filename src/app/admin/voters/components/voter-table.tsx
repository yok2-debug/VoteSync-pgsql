'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import type { Voter, Category, Election } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Download, Upload, Edit, Trash2, Loader2, KeyRound, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { VoterFormDialog } from './voter-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ResetPasswordDialog } from './reset-password-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { VoterImportDialog } from './voter-import-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkUpdateCategoryDialog } from './bulk-update-category-dialog';
import { renderToStaticMarkup } from 'react-dom/server';
import { VoterCard } from './voter-card';


type VoterTableProps = {
  voters: Voter[];
  categories: Category[];
  elections: Election[];
  refreshVoters: () => Promise<void>;
  temporaryPasswords: Record<string, string>;
  setTemporaryPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

type EnrichedVoter = Voter & { categoryName?: string };

const ITEMS_PER_PAGE = 100;

export function VoterTable({
  voters,
  categories,
  elections,
  refreshVoters,
  temporaryPasswords,
  setTemporaryPasswords,
}: VoterTableProps) {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [showBulkResetPasswordDialog, setShowBulkResetPasswordDialog] = useState(false);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBulkResettingPassword, setIsBulkResettingPassword] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const enrichedVoters = useMemo(() => {
    return voters.map(voter => ({
      ...voter,
      categoryName: categoryMap.get(voter.category) || 'N/A'
    }));
  }, [voters, categoryMap]);

  const filteredVoters = useMemo(() => enrichedVoters.filter(
    (voter) =>
      (voter.name.toLowerCase().includes(filter.toLowerCase()) ||
        voter.id.toLowerCase().includes(filter.toLowerCase()) ||
        (voter.nik && voter.nik.includes(filter))) &&
      (categoryFilter === 'all' || voter.category === categoryFilter)
  ), [enrichedVoters, filter, categoryFilter]);

  useEffect(() => {
    setRowSelection({});
    setCurrentPage(1);
  }, [filter, categoryFilter]);

  const totalPages = Math.ceil(filteredVoters.length / ITEMS_PER_PAGE);
  const paginatedVoters = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredVoters.slice(startIndex, endIndex);
  }, [filteredVoters, currentPage]);

  const selectedVoterIds = useMemo(() => Object.keys(rowSelection).filter(id => rowSelection[id]), [rowSelection]);
  const numSelected = selectedVoterIds.length;

  const handleSelectAll = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    if (checked) {
      paginatedVoters.forEach(voter => newSelection[voter.id] = true);
    }
    setRowSelection(newSelection);
  };

  const handleExportTemplate = () => {
    setIsExporting(true);

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['nik', 'name', 'birthPlace', 'birthDate', 'gender', 'address', 'category'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pemilih');

    XLSX.writeFile(workbook, 'voter_template.xlsx');

    toast({ title: "Template berhasil diekspor." });
    setIsExporting(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setIsImporting(true);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
          cellDates: false,
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error('File XLSX tidak memiliki worksheet.');
        }

        const worksheet = workbook.Sheets[firstSheetName];

        const data = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });

        const filteredData = data.filter(row =>
          Object.values(row as object).some(
            val => val !== '' && val !== null
          )
        );

        setImportedData(filteredData);
        setShowImportDialog(true);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error membaca file XLSX',
          description: error instanceof Error
            ? error.message
            : 'File XLSX tidak dapat dibaca.',
        });
      } finally {
        setIsImporting(false);
      }
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleAdd = () => {
    setSelectedVoter(null);
    setShowFormDialog(true);
  };

  const handleEdit = async (voter: Voter) => {
    try {
      const { getVoter } = await import('@/app/actions/voters');

      const result = await getVoter(voter.id);

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Gagal mengambil data pemilih.');
      }

      setSelectedVoter(result.data);
      setShowFormDialog(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal membuka data pemilih',
        description:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan tidak diketahui.',
      });
    }
  };

  const handleDelete = (voter: Voter) => {
    setSelectedVoter(voter);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedVoter) return;
    setIsDeleting(true);
    try {
      const { deleteVoters } = await import('@/app/actions/voters');
      const result = await deleteVoters([selectedVoter.id]);

      if (!result.success) {
        throw new Error(result.message || 'Gagal menghapus pemilih.');
      }
      toast({ title: 'Pemilih berhasil dihapus.' });
      refreshVoters();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menghapus pemilih',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedVoter(null);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const { deleteVoters } = await import('@/app/actions/voters');
      const result = await deleteVoters(selectedVoterIds);

      if (!result.success) {
        throw new Error(result.message || 'Gagal menghapus pemilih.');
      }

      toast({ title: `${numSelected} pemilih berhasil dihapus.` });
      refreshVoters();
      setRowSelection({});
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error menghapus pemilih',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.',
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };


  const handleResetPassword = (voter: Voter) => {
    setSelectedVoter(voter);
    setShowResetPasswordDialog(true);
  };

  const handleBulkResetPassword = async () => {
    setIsBulkResettingPassword(true);

    try {
      const { resetVotersPasswords } = await import('@/app/actions/voters');

      const idsToReset =
        numSelected > 0
          ? selectedVoterIds
          : enrichedVoters.map(voter => voter.id);

      const result = await resetVotersPasswords(idsToReset);

      if (!result.success) {
        throw new Error(result.message || 'Gagal mereset password pemilih.');
      }

      await refreshVoters();

      if (result.data && result.data.length > 0) {
        setTemporaryPasswords(prev => ({
          ...prev,
          ...Object.fromEntries(
            result.data!.map(item => [item.voterId, item.password])
          ),
        }));
      }

      toast({
        title: 'Password berhasil direset',
        description: `${result.data?.length || 0} pemilih mendapatkan password baru. Kartu sekarang dapat dicetak.`,
      });

      setShowBulkResetPasswordDialog(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal mereset password',
        description:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan tidak diketahui.',
      });
    } finally {
      setIsBulkResettingPassword(false);
    }
  };

  const { printButtonLabel, idsForPrintLogic } = useMemo(() => {
    if (numSelected > 0) {
      return {
        printButtonLabel: `Cetak Kartu (${numSelected})`,
        idsForPrintLogic: selectedVoterIds,
      };
    }
    if (categoryFilter === 'all') {
      return {
        printButtonLabel: `Cetak Semua (${filteredVoters.length})`,
        idsForPrintLogic: filteredVoters.map(v => v.id),
      };
    }
    const filteredByCategory = filteredVoters.filter(v => v.category === categoryFilter);
    return {
      printButtonLabel: `Cetak Kategori (${filteredByCategory.length})`,
      idsForPrintLogic: filteredByCategory.map(v => v.id),
    };
  }, [numSelected, selectedVoterIds, categoryFilter, filteredVoters]);

  const handlePrint = () => {
    setIsPrinting(true);

    const votersToPrint = enrichedVoters.filter(v =>
      idsForPrintLogic.includes(v.id)
    );

    if (votersToPrint.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak ada pemilih untuk dicetak',
        description: 'Tidak ada pemilih yang cocok dengan kriteria cetak Anda.',
      });
      setIsPrinting(false);
      return;
    }

    const votersWithPassword = votersToPrint.filter(
      voter => !!temporaryPasswords[voter.id]
    );

    const votersWithoutPassword = votersToPrint.filter(
      voter => !temporaryPasswords[voter.id]
    );

    if (votersWithPassword.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Password tidak tersedia',
        description:
          'Password pemilih tidak tersedia untuk dicetak. Silakan buat atau reset password terlebih dahulu.',
      });
      setIsPrinting(false);
      return;
    }

    if (votersWithoutPassword.length > 0) {
      toast({
        title: 'Sebagian kartu tidak dicetak',
        description:
          `${votersWithoutPassword.length} pemilih tidak memiliki password sementara. ` +
          'Reset password terlebih dahulu jika kartu mereka ingin dicetak.',
      });
    }

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Gagal membuka jendela cetak',
        description:
          'Silakan izinkan pop-up untuk situs ini dan coba lagi.',
      });
      setIsPrinting(false);
      return;
    }

    const cardsHtml = votersWithPassword
      .map(voter => {
        const temporaryPassword = temporaryPasswords[voter.id];

        const voterCategory = categories.find(
          c => c.id === voter.category
        );

        const electionNames =
          voterCategory?.allowedElections
            ?.map(eId => elections.find(e => e.id === eId)?.name)
            .filter((name): name is string => !!name) || [];

        return renderToStaticMarkup(
          <VoterCard
            voter={{
              ...voter,
              password: temporaryPassword,
            }}
            electionNames={electionNames}
          />
        );
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kartu Login Pemilih</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page {
                size: A4 portrait;
                margin: 1cm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            body {
              font-family: Arial, sans-serif;
            }
            .page-container {
              display: flex;
              flex-wrap: wrap;
              gap: 5mm;
            }
            .card-wrapper {
              flex: 0 0 calc(33.333% - 4mm);
              max-width: calc(33.333% - 4mm);
              break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            ${cardsHtml}
          </div>
          <script>
            setTimeout(() => {
              window.addEventListener('afterprint', () => {
                window.close();
              });
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Password hanya disimpan sementara untuk proses pencetakan.
    // Setelah HTML kartu dikirim ke jendela print, hapus dari state browser.
    setTemporaryPasswords({});
    setIsPrinting(false);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx"
      />
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <form className="flex gap-2">
          <Input
            placeholder="Saring berdasarkan nama, ID, atau NIK..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Saring berdasarkan kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePrint} type="button" disabled={isPrinting}>
            {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            {printButtonLabel}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkResetPasswordDialog(true)}
            disabled={isBulkResettingPassword || enrichedVoters.length === 0}
          >
            {isBulkResettingPassword && numSelected === 0
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <KeyRound className="mr-2 h-4 w-4" />}
            Reset Semua ({enrichedVoters.length})
          </Button>
          <Button variant="outline" onClick={handleExportTemplate} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Ekspor Template
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Impor XLSX
          </Button>
          <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Pemilih
          </Button>
        </div>
      </div>

      {numSelected > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
          <p className="text-sm font-medium">{numSelected} pemilih dipilih.</p>
          <Button size="sm" onClick={() => setShowBulkUpdateDialog(true)}>
            Ubah Kategori
          </Button>
          <Button
            size="sm"
            onClick={() => setShowBulkResetPasswordDialog(true)}
            disabled={isBulkResettingPassword}
          >
            {isBulkResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password {numSelected} Pemilih
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setShowBulkDeleteDialog(true)}>
            Hapus {numSelected} Pemilih
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRowSelection({})}>
            Batalkan Pilihan
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={paginatedVoters.length > 0 && numSelected === paginatedVoters.length && paginatedVoters.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>ID Pemilih</TableHead>
              <TableHead>NIK</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Telah Memilih</TableHead>
              <TableHead className="text-right">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVoters.length > 0 ? (
              paginatedVoters.map((voter) => (
                <TableRow key={voter.id} data-state={rowSelection[voter.id] ? 'selected' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={rowSelection[voter.id] || false}
                      onCheckedChange={(checked) => setRowSelection(prev => ({ ...prev, [voter.id]: !!checked }))}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="font-mono">{voter.id}</TableCell>
                  <TableCell className="font-mono">{voter.nik || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{voter.name}</TableCell>
                  <TableCell>{voter.categoryName}</TableCell>
                  <TableCell>{voter.hasVoted && Object.keys(voter.hasVoted).length > 0 ? 'Ya' : 'Tidak'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(voter)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Ubah
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(voter)}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(voter)}>
                          <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                          <span className="text-destructive">Hapus</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Tidak ada pemilih ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Menampilkan {paginatedVoters.length} dari {filteredVoters.length} pemilih.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Sebelumnya
          </Button>
          <span className="text-sm">
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      <VoterFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        voter={selectedVoter}
        categories={categories}
	onSuccess={async (data) => {
	  await refreshVoters();

	  const voterId = data?.voterId;
	  const password = data?.password;

	  if (voterId && password) {
	    setTemporaryPasswords(prev => ({
	      ...prev,
	      [voterId]: password,
	    }));
	  }
	}}
      />

      {showImportDialog && <VoterImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        data={importedData}
        categories={categories}
        onSuccess={async (data) => {
          await refreshVoters();

          if (data && data.length > 0) {
            setTemporaryPasswords(prev => ({
              ...prev,
              ...Object.fromEntries(
                data.map(item => [item.voterId, item.password])
              ),
            }));
          }
        }}
      />}

      {showBulkUpdateDialog && <BulkUpdateCategoryDialog
        open={showBulkUpdateDialog}
        onOpenChange={setShowBulkUpdateDialog}
        selectedVoterIds={selectedVoterIds}
        categories={categories}
        onSuccess={() => {
          setRowSelection({});
          refreshVoters();
        }}
      />}

      {selectedVoter && (
        <ResetPasswordDialog
          open={showResetPasswordDialog}
          onOpenChange={setShowResetPasswordDialog}
          voter={selectedVoter}
	  onSuccess={async (data) => {
	    await refreshVoters();

	    setTemporaryPasswords(prev => ({
	      ...prev,
	      [data.voterId]: data.password,
	    }));
	  }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pemilih "{selectedVoter?.name}" ({selectedVoter?.id}) secara permanen beserta semua data terkait seperti suara dan status kandidat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showBulkResetPasswordDialog}
        onOpenChange={setShowBulkResetPasswordDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {numSelected > 0
                ? `Reset Password ${numSelected} Pemilih?`
                : `Reset Password Semua ${enrichedVoters.length} Pemilih?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {numSelected > 0
                ? `Password ${numSelected} pemilih yang dipilih akan diganti dengan password baru. Password lama tidak akan berlaku lagi.`
                : `Password semua ${enrichedVoters.length} pemilih akan diganti dengan password baru. Password lama tidak akan berlaku lagi.`}
              {' '}Setelah proses selesai, password baru dapat langsung dicetak pada kartu pemilih.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkResettingPassword}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkResetPassword}
              disabled={isBulkResettingPassword}
            >
              {isBulkResettingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {numSelected > 0
                ? `Ya, Reset ${numSelected} Password`
                : `Ya, Reset Semua Password`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus secara permanen {numSelected} pemilih yang dipilih dan semua data terkaitnya (suara, status kandidat, dll).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90" disabled={isBulkDeleting}>
              {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus {numSelected} Pemilih
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
