"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
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
import { User } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export const usersColumns: ColumnDef<User>[] = [
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
    accessorKey: "created_at",
    header: "Criado em",
    cell: ({ row }) => format(new Date(row.original.created_at), "dd/MM/yyyy", { locale: ptBR }),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
      const queryClient = useQueryClient();

      const handleDelete = async () => {
        if (!confirm(`Tem certeza que deseja deletar o usuário ${user.email}?`)) return;

        const { error } = await supabase.functions.invoke('delete-user', {
          body: { id: user.id },
        });

        if (error) {
          showError(`Erro ao deletar usuário: ${error.message}`);
        } else {
          showSuccess('Usuário deletado com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }
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
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              Deletar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]