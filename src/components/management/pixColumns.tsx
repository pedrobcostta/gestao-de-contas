"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Copy } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import { PixKey } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const keyTypeLabels: { [key: string]: string } = {
  cpf_cnpj: "CPF/CNPJ",
  celular: "Celular",
  email: "E-mail",
  aleatoria: "Aleatória",
};

export const pixColumns = ({ onEdit }: { onEdit: (pixKey: PixKey) => void }): ColumnDef<PixKey>[] => {
  const queryClient = useQueryClient();

  const handleDelete = async (pixKeyId: string) => {
    const { error } = await supabase.from('pix_keys').delete().eq('id', pixKeyId);
    if (error) {
      showError("Erro ao deletar chave PIX.");
    } else {
      showSuccess("Chave PIX deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['pix_keys'] });
    }
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    showSuccess("Chave PIX copiada para a área de transferência!");
  };

  return [
    {
      accessorKey: "key_type",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="outline">{keyTypeLabels[row.original.key_type]}</Badge>
      ),
    },
    {
      accessorKey: "key_value",
      header: "Chave PIX",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.key_value}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(row.original.key_value)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "owner_name",
      header: "Titular",
    },
    {
      accessorKey: "bank_name",
      header: "Banco",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const pixKey = row.original
  
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(pixKey)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopy(pixKey.key_value)}>
                Copiar Chave
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(pixKey.id)} className="text-red-600">
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}