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
import { PixKey } from "@/types";
import { pixColumns } from "./pixColumns";
import { supabase } from "@/integrations/supabase/client";
import { PixForm } from "./PixForm";

interface PixTabContentProps {
  managementType: PixKey["management_type"];
}

export function PixTabContent({ managementType }: PixTabContentProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPixKey, setSelectedPixKey] = useState<PixKey | null>(null);

  const { data: pixKeys = [], isLoading } = useQuery({
    queryKey: ['pix_keys', managementType],
    queryFn: async (): Promise<PixKey[]> => {
      const { data, error } = await supabase
        .from('pix_keys')
        .select('*')
        .eq('management_type', managementType);
      
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const handleEdit = (pixKey: PixKey) => {
    setSelectedPixKey(pixKey);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedPixKey(null);
    setIsFormOpen(true);
  };

  const table = useReactTable({
    data: pixKeys,
    columns: pixColumns({ onEdit: handleEdit }),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd}>Adicionar Chave PIX</Button>
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
                <TableCell colSpan={pixColumns({ onEdit: handleEdit }).length} className="h-24 text-center">
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
                <TableCell colSpan={pixColumns({ onEdit: handleEdit }).length} className="h-24 text-center">
                  Nenhuma chave PIX encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PixForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        pixKey={selectedPixKey}
        managementType={managementType}
      />
    </div>
  );
}