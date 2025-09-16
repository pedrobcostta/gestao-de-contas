import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { PermissionsGrid } from "./PermissionsGrid";

interface UserEditFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User;
}

export function UserEditForm({ isOpen, setIsOpen, user }: UserEditFormProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedManagement, setSelectedManagement] = useState('pessoal');

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

              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <PermissionsGrid
                    permissions={field.value || []}
                    onPermissionsChange={field.onChange}
                    selectedManagement={selectedManagement}
                    onSelectedManagementChange={setSelectedManagement}
                  />
                )}
              />

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