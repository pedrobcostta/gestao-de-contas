import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
        permissions: data.permissions,
      });
    }
  }, [data, form]);

  const permissions = form.watch('permissions', []);

  const handlePermissionChange = (tab: string, action: string, checked: boolean) => {
    const newPermissions = [...permissions];
    const permIndex = newPermissions.findIndex(p => p.management_type === selectedManagement && p.tab === tab);

    if (permIndex > -1) {
      newPermissions[permIndex][`can_${action}`] = checked;
    } else {
      newPermissions.push({
        management_type: selectedManagement,
        tab,
        can_read: action === 'read' ? checked : false,
        can_write: action === 'write' ? checked : false,
        can_edit: action === 'edit' ? checked : false,
        can_delete: action === 'delete' ? checked : false,
      });
    }
    form.setValue('permissions', newPermissions);
  };

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: user.id,
          firstName: values.firstName,
          lastName: values.lastName,
          status: values.status,
          permissions: values.permissions,
        },
      });
      if (error) throw error;
      showSuccess("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Sobrenome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <TableHead>Tab</TableHead>
                        <TableHead className="text-center">Ler</TableHead>
                        <TableHead className="text-center">Escrever</TableHead>
                        <TableHead className="text-center">Editar</TableHead>
                        <TableHead className="text-center">Deletar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabs.map(tab => {
                        const currentPerm = permissions.find((p: Permission) => p.management_type === selectedManagement && p.tab === tab);
                        return (
                          <TableRow key={tab}>
                            <TableCell className="font-medium">{tab.charAt(0).toUpperCase() + tab.slice(1)}</TableCell>
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