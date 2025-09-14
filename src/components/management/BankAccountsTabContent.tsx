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
import { BankAccountForm } from "./BankAccountForm";
import { bankAccountsColumns } from "./bankAccountsColumns";
import { supabase } from "@/integrations/supabase/client";

interface BankAccountsTabContentProps {
  managementType: BankAccount["management_type"];
}

export function BankAccountsTabContent({ managementType }: BankAccountsTabContentProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

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

  const table = useReactTable({
    data: bankAccounts,
    columns: bankAccountsColumns({ onEdit: (account) => {
      setSelectedAccount(account);
      setIsFormOpen(true);
    }}),
    getCoreRowModel: getCoreRowModel(),
  });

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddAccount}>Adicionar Conta</Button>
      </div>
      <div className="rounded-md border">
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
                <TableCell colSpan={bankAccountsColumns.length} className="h-24 text-center">
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
                <TableCell colSpan={bankAccountsColumns.length} className="h-24 text-center">
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
        bankAccount={selectedAccount}
        managementType={managementType}
      />
    </div>
  );
}