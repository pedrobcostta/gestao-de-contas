"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Copy, QrCode } from "lucide-react"

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
import { showSuccess } from "@/utils/toast";

const keyTypeLabels: { [key: string]: string } = {
  cpf_cnpj: "CPF/CNPJ",
  celular: "Celular",
  email: "E-mail",
  aleatoria: "Aleatória",
  br_code: "Copia e Cola",
};

export const pixColumns = ({ onEdit, onViewQr, onDelete, onView }: { onEdit: (pixKey: PixKey) => void; onViewQr: (pixKey: PixKey) => void; onDelete: (pixKey: PixKey) => void; onView: (pixKey: PixKey) => void; }): ColumnDef<PixKey>[] => {
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
      cell: ({ row }) => {
        const value = row.original.key_value;
        if (row.original.key_type === 'br_code') {
          return <span className="font-mono text-xs">{value.substring(0, 30)}...</span>
        }
        return value;
      }
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

        const handleCopy = (type: 'key' | 'full') => {
          let textToCopy = '';
          if (type === 'key') {
            textToCopy = pixKey.key_value;
          } else {
            textToCopy = `Chave PIX: ${pixKey.key_value}\nBanco: ${pixKey.bank_name}\nTitular: ${pixKey.owner_name}`;
          }
          navigator.clipboard.writeText(textToCopy);
          showSuccess("Dados copiados para a área de transferência!");
        };
  
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
              <DropdownMenuItem onClick={() => onView(pixKey)}>
                Visualizar
              </DropdownMenuItem>
              {pixKey.key_type === 'br_code' && (
                <DropdownMenuItem onClick={() => onViewQr(pixKey)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Ver QR Code
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleCopy('key')}>
                Copiar Chave
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopy('full')}>
                Copiar Dados Completos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(pixKey)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(pixKey)} className="text-red-600">
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}