import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import { usersColumns } from "./usersColumns";
import { supabase } from "@/integrations/supabase/client";
import { UserForm } from "./UserForm";
import { UserEditForm } from "./UserEditForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { showError, showSuccess } from "@/utils/toast";

export function UsersTabContent() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const { data, error } = await supabase.functions.invoke('list-users');
      if (error) throw new Error(error.message);
      return data.users || [];
    }
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditFormOpen(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    const { error } = await supabase.functions.invoke('delete-user', {
      body: { id: userToDelete.id },
    });

    if (error) {
      showError(`Erro ao deletar usuário: ${error.message}`);
    } else {
      showSuccess('Usuário deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
    setIsConfirmOpen(false);
    setUserToDelete(null);
  };

  const tableColumns = usersColumns({ onEdit: handleEdit, onDelete: handleDelete });

  const table = useReactTable({
    data: users,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : users.length > 0 ? (
        users.map(user => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle className="text-lg">{user.first_name} {user.last_name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="font-semibold">E-mail</p>
                <p className="truncate">{user.email}</p>
              </div>
              <div>
                <p className="font-semibold">Criado em</p>
                <p>{format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button size="sm" onClick={() => handleEdit(user)}>Editar</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(user)}>Deletar</Button>
            </CardFooter>
          </Card>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>
      )}
    </div>
  );

  const renderDesktopView = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[700px]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                Carregando...
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsFormOpen(true)}>Adicionar Usuário</Button>
      </div>
      {isMobile ? renderMobileView() : renderDesktopView()}
      <UserForm isOpen={isFormOpen} setIsOpen={setIsFormOpen} />
      {selectedUser && (
        <UserEditForm
          isOpen={isEditFormOpen}
          setIsOpen={setIsEditFormOpen}
          user={selectedUser}
        />
      )}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmDelete}
        title="Confirmar Deleção"
        description={`Tem certeza que deseja deletar o usuário ${userToDelete?.email}?`}
      />
    </div>
  );
}