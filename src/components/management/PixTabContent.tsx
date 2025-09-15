import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { QRCodeModal } from "./QRCodeModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { showError, showSuccess } from "@/utils/toast";

interface PixTabContentProps {
  managementType: PixKey["management_type"];
}

const keyTypeLabels: { [key: string]: string } = {
  cpf_cnpj: "CPF/CNPJ",
  celular: "Celular",
  email: "E-mail",
  aleatoria: "Aleatória",
  br_code: "Copia e Cola",
};

export function PixTabContent({ managementType }: PixTabContentProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPixKey, setSelectedPixKey] = useState<PixKey | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pixKeyToDelete, setPixKeyToDelete] = useState<PixKey | null>(null);

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

  const handleViewQr = (pixKey: PixKey) => {
    if (pixKey.key_type === 'br_code') {
      setQrCodeValue(pixKey.key_value);
      setIsQrModalOpen(true);
    }
  };

  const handleDelete = (pixKey: PixKey) => {
    setPixKeyToDelete(pixKey);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pixKeyToDelete) return;
    const { error } = await supabase.from('pix_keys').delete().eq('id', pixKeyToDelete.id);
    if (error) {
      showError("Erro ao deletar chave PIX.");
    } else {
      showSuccess("Chave PIX deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['pix_keys'] });
    }
    setIsConfirmOpen(false);
    setPixKeyToDelete(null);
  };

  const tableColumns = pixColumns({ onEdit: handleEdit, onViewQr: handleViewQr, onDelete: handleDelete });

  const table = useReactTable({
    data: pixKeys,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : pixKeys.length > 0 ? (
        pixKeys.map(key => (
          <Card key={key.id}>
            <CardHeader>
              <CardTitle className="text-lg">{key.owner_name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">Chave</p>
                <p className="truncate">{key.key_value}</p>
              </div>
              <div>
                <p className="font-semibold">Tipo</p>
                <p>{keyTypeLabels[key.key_type]}</p>
              </div>
              <div className="col-span-2">
                <p className="font-semibold">Banco</p>
                <p>{key.bank_name}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button size="sm" onClick={() => handleEdit(key)}>Editar</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(key)}>Deletar</Button>
            </CardFooter>
          </Card>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-8">Nenhuma chave PIX encontrada.</p>
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
                Nenhuma chave PIX encontrada.
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
        <Button onClick={handleAdd}>Adicionar Chave PIX</Button>
      </div>
      {isMobile ? renderMobileView() : renderDesktopView()}
      <PixForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        pixKey={selectedPixKey}
        managementType={managementType}
      />
      <QRCodeModal
        isOpen={isQrModalOpen}
        setIsOpen={setIsQrModalOpen}
        value={qrCodeValue}
      />
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmDelete}
        title="Confirmar Deleção"
        description={`Tem certeza que deseja deletar a chave PIX "${pixKeyToDelete?.key_value}"?`}
      />
    </div>
  );
}