"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Repeat } from "lucide-react"
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
import { usePermissions } from "@/contexts/PermissionsProvider";

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  pago: "default",
  pendente: "secondary",
  vencido: "destructive",
};

interface ColumnsProps {
  onView: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  managementType: string;
}

export const columns = ({ onView, onEdit, onDelete, managementType }: ColumnsProps): ColumnDef<Account>[] => {
  const { hasPermission } = usePermissions();

  return [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => {
        const account = row.original;
        const isGroupedParent = !!account.subRows;

        return (
          <div className="flex items-center gap-2">
            {account.account_type === 'recorrente' && <span title="Conta Recorrente"><Repeat className="h-4 w-4 text-muted-foreground" /></span>}
            <span>
              {account.name}
              {account.account_type === 'parcelada' && ` (${account.installment_current}/${account.installments_total})`}
            </span>
            {isGroupedParent && <Badge variant="outline">Compra</Badge>}
          </div>
        )
      },
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
      cell: ({ row }) => {
        const account = row.original;
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
              {hasPermission(managementType, 'contas', 'read') && (
                <DropdownMenuItem onClick={() => onView(account)}>
                  Visualizar
                </DropdownMenuItem>
              )}
              {hasPermission(managementType, 'contas', 'edit') && (
                <DropdownMenuItem onClick={() => onEdit(account)}>
                  Editar
                </DropdownMenuItem>
              )}
              {hasPermission(managementType, 'contas', 'delete') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(account)} className="text-red-600">
                    Deletar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}