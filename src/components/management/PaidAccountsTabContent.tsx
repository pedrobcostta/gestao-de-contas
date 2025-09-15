import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface PaidAccountsTabContentProps {
  managementType: Account["management_type"];
  selectedYear: number;
  selectedMonth: number;
}

export function PaidAccountsTabContent({ managementType, selectedYear, selectedMonth }: PaidAccountsTabContentProps) {
  const isMobile = useIsMobile();
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

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const tableColumns = columns({
    onEdit: handleEditAccount,
    onView: handleViewAccount,
  });

  const table = useReactTable({
    data: paidAccounts,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : paidAccounts.length > 0 ? (
        paidAccounts.map(account => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="text-lg">{account.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">Valor Pago</p>
                <p>{formatCurrency(account.total_value)}</p>
              </div>
              <div>
                <p className="font-semibold">Data Pagamento</p>
                <p>{account.payment_date ? format(new Date(`${account.payment_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleViewAccount(account)}>Visualizar</Button>
              <Button size="sm" onClick={() => handleEditAccount(account)}>Editar</Button>
            </CardFooter>
          </Card>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-8">Nenhuma conta paga encontrada.</p>
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
                Nenhuma conta paga encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div>
      {isMobile ? renderMobileView() : renderDesktopView()}
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