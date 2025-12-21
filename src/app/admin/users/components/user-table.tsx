'use client';
import { useState, useMemo, useEffect } from 'react';
import type { AdminUser, Role } from '@/lib/types';
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
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
import { UserFormDialog } from './user-form-dialog';
import { ResetUserPasswordDialog } from './reset-user-password-dialog';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 20;

type UserTableProps = {
  users: AdminUser[];
  roles: Role[];
  onRefresh: () => void;
};

export function UserTable({ users, roles, onRefresh }: UserTableProps) {
  const [filter, setFilter] = useState('');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);

  const filteredUsers = useMemo(() => users.filter((user) =>
    user.username.toLowerCase().includes(filter.toLowerCase())
  ), [users, filter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleAdd = () => {
    setSelectedUser(null);
    setShowFormDialog(true);
  };

  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setShowFormDialog(true);
  };

  const handleResetPassword = (user: AdminUser) => {
    setSelectedUser(user);
    setShowResetPasswordDialog(true);
  };

  const handleDelete = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Gagal menghapus pengguna.');
      }

      toast({ title: 'Pengguna berhasil dihapus.' });
      onRefresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus pengguna',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Saring pengguna..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead className="w-[100px] text-right">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={roleMap.get(user.roleId) === 'Super Admin' ? 'default' : 'secondary'}>
                      {roleMap.get(user.roleId) || 'Tidak diketahui'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Ubah
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Reset Kata Sandi
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(user)} disabled={user.username === 'admin'}>
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
                <TableCell colSpan={3} className="h-24 text-center">
                  Tidak ada pengguna ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={filteredUsers.length}
      />

      <UserFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        user={selectedUser}
        roles={roles}
        onRefresh={onRefresh}
      />

      {selectedUser && (
        <ResetUserPasswordDialog
          open={showResetPasswordDialog}
          onOpenChange={setShowResetPasswordDialog}
          user={selectedUser}
          onSuccess={onRefresh}
        />
      )}


      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pengguna secara permanen
              "{selectedUser?.username}".
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
    </div>
  );
}
