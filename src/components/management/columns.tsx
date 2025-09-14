"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Repeat, ChevronDown, ChevronRight } from "lucide-react"
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

export const columns = ({ onView, onEdit }: { onView: (account: Account) => void; onEdit: (account: Account) => void; }): ColumnDef<Account & { isGroup?: boolean, subRows?: Account[], installment_summary?: string }>[] => {
  const queryClient = useQueryClient();

  const handleDelete = async (account: Account & { isGroup?: boolean, subRows?: Account[] }) => {
    let error = null;
    let successMessage = "";

    if (account.isGroup) {
      if (confirm(`Tem certeza que deseja deletar TODAS as ${account.subRows?.length} parcelas relacionadas a esta compra?`)) {
        const { error: deleteError } = await supabase.from('accounts').delete().eq('group_id', account.id);
        error = deleteError;
        successMessage = "Todas as parcelas foram deletadas com sucesso!";
      }
    } else if (account.group_id && account.account_type === 'parcelada') {
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
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return row.getCanExpand() ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={row.getToggleExpandedHandler()}
            className="w-8 h-8 p-0"
          >
            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : <div className="w-8"></div>;
      },
    },
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.account_type === 'recorrente' && <span title="Conta Recorrente"><Repeat className="h-4 w-4 text-muted-foreground" /></span>}
          <span>{row.original.name}</span>
        </div>
      ),
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
      id: "installment",
      header: "Parcela",
      cell: ({ row }) => {
        const { account_type, installment_current, installments_total, isGroup, installment_summary } = row.original;
        if (isGroup) {
          return <Badge variant="outline">{installment_summary}</Badge>;
        }
        if (account_type === 'parcelada' && installment_current && installments_total) {
          return `${installment_current} / ${installments_total}`;
        }
        return null;
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const account = row.original;
        if (account.isGroup) {
          const paidCount = account.subRows?.filter(r => r.status === 'pago').length || 0;
          const overdueCount = account.subRows?.filter(r => r.status === 'vencido').length || 0;
          const pendingCount = (account.subRows?.length || 0) - paidCount - overdueCount;
          
          const summaries = [];
          if (overdueCount > 0) summaries.push(`${overdueCount} vencida(s)`);
          if (pendingCount > 0) summaries.push(`${pendingCount} pendente(s)`);
          if (paidCount > 0) summaries.push(`${paidCount} paga(s)`);

          if (summaries.length === 0) return null;

          return <span className="text-xs text-muted-foreground whitespace-nowrap">{summaries.join(', ')}</span>;
        }
        return (
          <Badge variant={statusVariant[account.status] || "secondary"}>
            {account.status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original;
  
        if (account.isGroup) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações do Grupo</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onView(account.subRows![0])}>
                  Visualizar Resumo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(account)} className="text-red-600">
                  Deletar Todas Parcelas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
  
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