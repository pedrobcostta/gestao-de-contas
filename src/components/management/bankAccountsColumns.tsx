"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
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
import { BankAccount } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { formatCurrency } from "@/lib/utils"

const accountTypeLabels: { [key: string]: string } = {
  conta_corrente: "Conta Corrente",
  poupanca: "Poupança",
  cartao_credito: "Cartão de Crédito",
};

export const bankAccountsColumns = ({ onEdit }: { onEdit: (bankAccount: BankAccount) => void }): ColumnDef<BankAccount>[] => {
  const queryClient = useQueryClient();

  const handleDelete = async (bankAccountId: string) => {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', bankAccountId);
    if (error) {
      showError("Erro ao deletar conta bancária.");
    } else {
      showSuccess("Conta bancária deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
    }
  };

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
      accessorKey: "card_limit",
      header: "Limite",
      cell: ({ row }) => row.original.account_type === 'cartao_credito' ? formatCurrency(row.original.card_limit) : 'N/A',
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
              <DropdownMenuItem onClick={() => handleDelete(bankAccount.id)} className="text-red-600">
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}