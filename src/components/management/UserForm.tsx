import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Permission } from "@/types";

const formSchema = z.object({
  first_name: z.string().min(1, "O nome é obrigatório."),
  last_name: z.string().min(1, "O sobrenome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  permissions: z.array(z.any()).optional(),
});

const managements = ['pessoal', 'casa', 'pai', 'mae'];
const tabs = ['contas', 'pix', 'bancos', 'pagas', 'relatorios', 'perfil', 'usuarios'];
const actions = ['read', 'write', 'edit', 'delete'];

interface UserFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function UserForm({ isOpen, setIsOpen }: UserFormProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedManagement, setSelectedManagement] = useState(managements[0]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      permissions: [],
    },
  });

  const permissions = form.watch('permissions', []);

  const updatePermissions = (newPermissions: Permission[]) => {
    form.setValue('permissions', newPermissions.filter(p => p.can_read || p.can_write || p.can_edit || p.can_delete));
  };

  const handleSelectAll = (checked: boolean) => {
    let newPermissions = [...(permissions || [])];
    tabs.forEach(tab => {
      const permIndex = newPermissions.findIndex(p => p.management_type === selectedManagement && p.tab === tab);
      if (permIndex > -1) {
        actions.forEach(action => { newPermissions[permIndex][`can_${action}`] = checked; });
      } else if (checked) {
        newPermissions.push({ management_type: selectedManagement, tab, can_read: true, can_write: true, can_edit: true, can_delete: true } as Permission);
      }
    });
    updatePermissions(newPermissions);
  };

  const handleSelectRow = (tab: string, checked: boolean) => {
    let newPermissions = [...(permissions || [])];
    const permIndex = newPermissions.findIndex(p => p.management_type === selectedManagement && p.tab === tab);
    if (permIndex > -1) {
      actions.forEach(action => { newPermissions[permIndex][`can_${action}`] = checked; });
    } else if (checked) {
      newPermissions.push({ management_type: selectedManagement, tab, can_read: true, can_write: true, can_edit: true, can_delete: true } as Permission);
    }
    updatePermissions(newPermissions);
  };

  const handlePermissionChange = (tab: string, action: string, checked: boolean) => {
    let newPermissions = [...(permissions || [])];
    const permIndex = newPermissions.findIndex(p => p.management_type === selectedManagement && p.tab === tab);
    if (permIndex > -1) {
      newPermissions[permIndex][`can_${action}`] = checked;
    } else if (checked) {
      newPermissions.push({
        management_type: selectedManagement, tab,
        can_read: action === 'read' && checked, can_write: action === 'write' && checked,
        can_edit: action === 'edit' && checked, can_delete: action === 'delete' && checked,
      } as Permission);
    }
    updatePermissions(newPermissions);
  };

  const areAllSelected = tabs.every(tab => {
    const perm = permissions?.find(p => p.management_type === selectedManagement && p.tab === tab);
    return perm && actions.every(action => perm[`can_${action}`]);
  });

  const isRowSelected = (tab: string) => {
    const perm = permissions?.find(p => p.management_type === selectedManagement && p.tab === tab);
    return perm && actions.every(action => perm[`can_${action}`]);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: values,
      });
      if (error) throw error;
      showSuccess("Usuário criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsOpen(false);
    } catch (error: any) {
      showError(`Erro ao criar usuário: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo e defina as permissões para criar uma nova conta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem><FormLabel>Sobrenome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Permissões</h3>
              <Select value={selectedManagement} onValueChange={setSelectedManagement}>
                <SelectTrigger className="w-[180px] mb-4">
                  <SelectValue placeholder="Selecione a Gestão" />
                </SelectTrigger>
                <SelectContent>
                  {managements.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={areAllSelected} onCheckedChange={handleSelectAll} /> Tab
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Ler</TableHead>
                      <TableHead className="text-center">Escrever</TableHead>
                      <TableHead className="text-center">Editar</TableHead>
                      <TableHead className="text-center">Deletar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabs.map(tab => {
                      const currentPerm = permissions?.find((p: Permission) => p.management_type === selectedManagement && p.tab === tab);
                      return (
                        <TableRow key={tab}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Checkbox checked={isRowSelected(tab)} onCheckedChange={(checked) => handleSelectRow(tab, !!checked)} />
                              {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </div>
                          </TableCell>
                          {actions.map(action => (
                            <TableCell key={action} className="text-center">
                              <Checkbox
                                checked={currentPerm?.[`can_${action}`] || false}
                                onCheckedChange={(checked) => handlePermissionChange(tab, action, !!checked)}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}