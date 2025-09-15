"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

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
import { BankAccount } from "@/types";

const accountTypeLabels: { [key: string]: string } = {
  conta_corrente: "Conta Corrente",
  poupanca: "Poupança",
  cartao_credito: "Cartão de Crédito",
};

export const bankAccountsColumns = ({ onEdit, onDelete }: { onEdit: (bankAccount: BankAccount) => void; onDelete: (bankAccount: BankAccount) => void; }): ColumnDef<BankAccount>[] => {
  return [
    {
      accessorKey: "account_name",
      header: "Nome da Conta",
    },
    {
      accessorKey: "bank_name",
      header: "Banco",
    },
    {
      accessorKey: "account_type",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant="secondary">{accountTypeLabels[row.original.account_type]}</Badge>
      ),
    },
    {
      accessorKey: "owner_name",
      header: "Titular",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const bankAccount = row.original
  
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
              <DropdownMenuItem onClick={() => onEdit(bankAccount)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(bankAccount)} className="text-red-600">
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}