import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { User, Permission } from "@/types";
import { showError, showSuccess } from "@/utils/toast";

interface UserEditFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User;
}

const managements = ['pessoal', 'casa', 'pai', 'mae'];
const tabs = ['contas', 'pix', 'bancos', 'pagas', 'relatorios', 'perfil', 'usuarios'];
const actions = ['read', 'write', 'edit', 'delete'];

export function UserEditForm({ isOpen, setIsOpen, user }: UserEditFormProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedManagement, setSelectedManagement] = useState(managements[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['userDetails', user.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-user-details', {
        body: { userId: user.id },
      });
      if (error) throw error;
      return data;
    },
  });

  const form = useForm();

  useEffect(() => {
    if (data) {
      form.reset({
        firstName: data.profile.first_name,
        lastName: data.profile.last_name,
        status: data.profile.status,
        email: user.email,
        password: "",
        permissions: data.permissions,
      });
    }
  }, [data, user.email, form]);

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

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        userId: user.id,
        firstName: values.firstName,
        lastName: values.lastName,
        status: values.status,
        email: values.email,
        permissions: values.permissions,
        password: values.password || undefined,
      };
      const { error } = await supabase.functions.invoke('update-user', { body: payload });
      if (error) throw error;
      showSuccess("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ['userDetails', user.id] });
      setIsOpen(false);
    } catch (error: any) {
      showError(`Erro ao atualizar usuário: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        {isLoading ? <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" /> : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Sobrenome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Nova Senha</FormLabel><FormControl><Input type="password" placeholder="Deixe em branco para não alterar" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
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
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}