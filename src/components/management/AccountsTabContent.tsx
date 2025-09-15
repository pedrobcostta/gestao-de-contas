import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Account } from "@/types";
import { columns } from "./columns";
import { AccountDetails } from "./AccountDetails";
import { AccountForm } from "./AccountForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { InstallmentDeleteDialog } from "./InstallmentDeleteDialog";

interface AccountsTabContentProps {
  data: (Account & { subRows?: Account[] })[];
  isLoading: boolean;
  managementType: Account["management_type"];
}

export function AccountsTabContent({ data, isLoading, managementType }: AccountsTabContentProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [accountForDetails, setAccountForDetails] = useState<Account | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isInstallmentConfirmOpen, setIsInstallmentConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const handleViewAccount = (account: Account) => {
    setAccountForDetails(account);
    setIsDetailsOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const handleDeleteAccount = (account: Account) => {
    setAccountToDelete(account);
    if (account.group_id && account.account_type === 'parcelada' && !account.subRows) {
      setIsInstallmentConfirmOpen(true);
    } else {
      setIsConfirmOpen(true);
    }
  };

  const confirmDeleteSingle = async () => {
    if (!accountToDelete) return;
    const { error } = await supabase.from('accounts').delete().eq('id', accountToDelete.id);
    if (error) {
      showError(`Erro ao deletar: ${error.message}`);
    } else {
      showSuccess("Apenas esta parcela foi deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
    setIsInstallmentConfirmOpen(false);
    setAccountToDelete(null);
  };

  const confirmDeleteAll = async () => {
    if (!accountToDelete?.group_id) return;
    const { error } = await supabase.from('accounts').delete().eq('group_id', accountToDelete.group_id);
    if (error) {
      showError(`Erro ao deletar: ${error.message}`);
    } else {
      showSuccess("Todas as parcelas foram deletadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
    setIsInstallmentConfirmOpen(false);
    setIsConfirmOpen(false);
    setAccountToDelete(null);
  };

  const confirmDeleteRegular = async () => {
    if (!accountToDelete) return;
    const { error } = await supabase.from('accounts').delete().eq('id', accountToDelete.id);
    if (error) {
      showError(`Erro ao deletar: ${error.message}`);
    } else {
      showSuccess("Conta deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
    setIsConfirmOpen(false);
    setAccountToDelete(null);
  };

  const tableColumns = columns({
    onView: handleViewAccount,
    onEdit: handleEditAccount,
    onDelete: handleDeleteAccount,
  });

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: row => !!row.original.subRows,
  });

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : data.length > 0 ? (
        data.map(account => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="text-lg">{account.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">Valor</p>
                <p>{formatCurrency(account.total_value)}</p>
              </div>
              <div>
                <p className="font-semibold">Vencimento</p>
                <p>{format(new Date(`${account.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="font-semibold">Status</p>
                <p>{account.status}</p>
              </div>
              {account.account_type === 'parcelada' && (
                <div>
                  <p className="font-semibold">Parcela</p>
                  <p>{account.installment_current}/{account.installments_total}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleViewAccount(account)}>Visualizar</Button>
              <Button size="sm" onClick={() => handleEditAccount(account)}>Editar</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteAccount(account)}>Deletar</Button>
            </CardFooter>
          </Card>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-8">Nenhuma conta encontrada.</p>
      )}
    </div>
  );

  const renderDesktopView = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[800px]">
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
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                Nenhuma conta encontrada.
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
        <Button onClick={handleAddAccount}>Adicionar Conta</Button>
      </div>
      
      {isMobile ? renderMobileView() : renderDesktopView()}

      <AccountDetails
        isOpen={isDetailsOpen}
        setIsOpen={setIsDetailsOpen}
        account={accountForDetails}
      />
      <AccountForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        account={selectedAccount}
        managementType={managementType}
      />
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={accountToDelete?.subRows ? confirmDeleteAll : confirmDeleteRegular}
        title="Confirmar Deleção"
        description={`Tem certeza que deseja deletar a conta "${accountToDelete?.name}"?`}
      />
      <InstallmentDeleteDialog
        isOpen={isInstallmentConfirmOpen}
        onOpenChange={setIsInstallmentConfirmOpen}
        onDeleteSingle={confirmDeleteSingle}
        onDeleteAll={confirmDeleteAll}
        accountName={accountToDelete?.name || ""}
      />
    </div>
  );
}