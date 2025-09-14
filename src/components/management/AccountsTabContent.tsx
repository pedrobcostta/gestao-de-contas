import { useState } from "react";
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
import { Account } from "@/types";
import { columns } from "./columns";
import { AccountDetails } from "./AccountDetails";
import { AccountForm } from "./AccountForm";

interface AccountsTabContentProps {
  data: Account[];
  isLoading: boolean;
  managementType: Account["management_type"];
}

export function AccountsTabContent({ data, isLoading, managementType }: AccountsTabContentProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [accountForDetails, setAccountForDetails] = useState<Account | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

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

  const table = useReactTable({
    data,
    columns: columns({
      onView: handleViewAccount,
      onEdit: handleEditAccount,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddAccount}>Adicionar Conta</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns({ onView: handleViewAccount, onEdit: handleEditAccount }).length} className="h-24 text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns({ onView: handleViewAccount, onEdit: handleEditAccount }).length} className="h-24 text-center">
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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
    </div>
  );
}