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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import { User } from "@/types";

export const usersColumns = ({ onEdit, onDelete }: { onEdit: (user: User) => void; onDelete: (user: User) => void; }): ColumnDef<User>[] => [
  {
    accessorKey: "first_name",
    header: "Nome",
  },
  {
    accessorKey: "last_name",
    header: "Sobrenome",
  },
  {
    accessorKey: "email",
    header: "E-mail",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === 'active' ? 'default' : 'destructive'}>
          {status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Criado em",
    cell: ({ row }) => format(new Date(row.original.created_at), "dd/MM/yyyy", { locale: ptBR }),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original

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
            <DropdownMenuItem onClick={() => onEdit(user)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(user)} className="text-red-600">
              Deletar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]