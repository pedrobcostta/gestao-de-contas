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

interface BankAccountsTabContentProps {
  managementType: BankAccount["management_type"];
}

export function BankAccountsTabContent({ managementType }: BankAccountsTabContentProps) {
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

  const table = useReactTable({
    data: bankAccounts,
    columns: bankAccountsColumns({ onEdit: handleEdit }),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd}>Adicionar Conta/Cartão</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
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
                <TableCell colSpan={bankAccountsColumns({ onEdit: handleEdit }).length} className="h-24 text-center">
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
                <TableCell colSpan={bankAccountsColumns({ onEdit: handleEdit }).length} className="h-24 text-center">
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <BankAccountForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        bankAccount={selectedBankAccount}
        managementType={managementType}
      />
    </div>
  );
}