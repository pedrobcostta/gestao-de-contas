import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BankAccount } from "@/types";
import { bankAccountsColumns } from "./bankAccountsColumns";
import { supabase } from "@/integrations/supabase/client";
import { BankAccountForm } from "./BankAccountForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface BankAccountsTabContentProps {
  managementType: BankAccount["management_type"];
}

const accountTypeLabels: { [key: string]: string } = {
  conta_corrente: "Conta Corrente",
  poupanca: "Poupança",
  cartao_credito: "Cartão de Crédito",
};

export function BankAccountsTabContent({ managementType }: BankAccountsTabContentProps) {
  const isMobile = useIsMobile();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ['bank_accounts', managementType],
    queryFn: async (): Promise<BankAccount[]> => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('management_type', managementType);
      
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const handleEdit = (bankAccount: BankAccount) => {
    setSelectedBankAccount(bankAccount);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedBankAccount(null);
    setIsFormOpen(true);
  };

  const tableColumns = bankAccountsColumns({ onEdit: handleEdit });

  const table = useReactTable({
    data: bankAccounts,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : bankAccounts.length > 0 ? (
        bankAccounts.map(account => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="text-lg">{account.account_name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">Banco</p>
                <p>{account.bank_name}</p>
              </div>
              <div>
                <p className="font-semibold">Tipo</p>
                <p>{accountTypeLabels[account.account_type]}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button size="sm" onClick={() => handleEdit(account)}>Editar</Button>
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
      <Table className="min-w-[600px]">
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
        <Button onClick={handleAdd}>Adicionar Conta/Cartão</Button>
      </div>
      {isMobile ? renderMobileView() : renderDesktopView()}
      <BankAccountForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        bankAccount={selectedBankAccount}
        managementType={managementType}
      />
    </div>
  );
}