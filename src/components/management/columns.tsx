"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { Account } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  pago: "default",
  pendente: "secondary",
  vencido: "destructive",
};

export const columns = ({ onView, onEdit }: { onView: (account: Account) => void; onEdit: (account: Account) => void; }): ColumnDef<Account>[] => {
  const queryClient = useQueryClient();

  const handleDelete = async (account: Account) => {
    let error = null;
    let successMessage = "";

    if (account.group_id && account.account_type === 'parcelada') {
      if (confirm("Esta é uma conta parcelada. Deseja deletar TODAS as parcelas relacionadas a esta compra?")) {
        const { error: deleteError } = await supabase.from('accounts').delete().eq('group_id', account.group_id);
        error = deleteError;
        successMessage = "Todas as parcelas foram deletadas com sucesso!";
      } else {
        const { error: deleteError } = await supabase.from('accounts').delete().eq('id', account.id);
        error = deleteError;
        successMessage = "Apenas esta parcela foi deletada com sucesso!";
      }
    } else {
      if (confirm(`Tem certeza que deseja deletar a conta "${account.name}"?`)) {
        const { error: deleteError } = await supabase.from('accounts').delete().eq('id', account.id);
        error = deleteError;
        successMessage = "Conta deletada com sucesso!";
      }
    }

    if (error) {
      showError(`Erro ao deletar: ${error.message}`);
    } else if (successMessage) {
      showSuccess(successMessage);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  };

  return [
    {
      accessorKey: "name",
      header: "Nome",
    },
    {
      accessorKey: "due_date",
      header: "Vencimento",
      cell: ({ row }) => format(new Date(`${row.original.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }),
    },
    {
      accessorKey: "total_value",
      header: "Valor",
      cell: ({ row }) => formatCurrency(row.original.total_value),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status] || "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original
  
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
              <DropdownMenuItem onClick={() => onView(account)}>
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(account)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(account)} className="text-red-600">
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}