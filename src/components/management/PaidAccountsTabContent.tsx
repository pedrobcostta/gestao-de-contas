import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { startOfMonth, endOfMonth, format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Account } from "@/types";
import { AccountForm } from "./AccountForm";
import { columns } from "./columns";
import { supabase } from "@/integrations/supabase/client";
import { AccountDetails } from "./AccountDetails";

interface PaidAccountsTabContentProps {
  managementType: Account["management_type"];
  selectedYear: number;
  selectedMonth: number;
}

export function PaidAccountsTabContent({ managementType, selectedYear, selectedMonth }: PaidAccountsTabContentProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [accountForDetails, setAccountForDetails] = useState<Account | null>(null);

  const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
  const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

  const { data: paidAccounts = [], isLoading } = useQuery({
    queryKey: ['accounts', managementType, 'pago', selectedYear, selectedMonth],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('management_type', managementType)
        .eq('status', 'pago')
        .gte('due_date', format(startDate, "yyyy-MM-dd"))
        .lte('due_date', format(endDate, "yyyy-MM-dd"));
      
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const handleViewAccount = (account: Account) => {
    setAccountForDetails(account);
    setIsDetailsOpen(true);
  };

  const table = useReactTable({
    data: paidAccounts,
    columns: columns({
      onEdit: (account) => {
        setSelectedAccount(account);
        setIsFormOpen(true);
      },
      onView: handleViewAccount,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhuma conta paga encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AccountForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        account={selectedAccount}
        managementType={managementType}
      />
      <AccountDetails
        isOpen={isDetailsOpen}
        setIsOpen={setIsDetailsOpen}
        account={accountForDetails}
      />
    </div>
  );
}