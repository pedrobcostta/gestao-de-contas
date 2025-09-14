import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PixKey } from "@/types";
import { showError, showSuccess } from "@/utils/toast";

const pixSchema = z.object({
  key_type: z.enum(["cpf_cnpj", "celular", "email", "aleatoria"]),
  key_value: z.string().min(1, "A chave PIX é obrigatória."),
  bank_name: z.string().optional(),
  owner_name: z.string().optional(),
});

interface PixFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  pixKey: PixKey | null;
  managementType: PixKey["management_type"];
}

export function PixForm({ isOpen, setIsOpen, pixKey, managementType }: PixFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof pixSchema>>({
    resolver: zodResolver(pixSchema),
    defaultValues: {
      key_type: "aleatoria",
      key_value: "",
      bank_name: "",
      owner_name: "",
    },
  });

  useEffect(() => {
    if (pixKey) {
      form.reset({
        key_type: pixKey.key_type,
        key_value: pixKey.key_value,
        bank_name: pixKey.bank_name || "",
        owner_name: pixKey.owner_name || "",
      });
    } else {
      form.reset({
        key_type: "aleatoria",
        key_value: "",
        bank_name: "",
        owner_name: "",
      });
    }
  }, [pixKey, form]);

  const onSubmit = async (values: z.infer<typeof pixSchema>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Você precisa estar logado.");
      return;
    }

    const pixData = {
      ...values,
      user_id: user.id,
      management_type: managementType,
    };

    const { error } = pixKey
      ? await supabase.from("pix_keys").update(pixData).eq("id", pixKey.id)
      : await supabase.from("pix_keys").insert(pixData);

    if (error) {
      showError(`Erro ao salvar chave PIX: ${error.message}`);
    } else {
      showSuccess(`Chave PIX ${pixKey ? 'atualizada' : 'criada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['pix_keys', managementType] });
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pixKey ? "Editar Chave PIX" : "Adicionar Nova Chave PIX"}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da chave PIX abaixo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="key_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Chave</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="aleatoria">Aleatória</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="celular">Celular</SelectItem>
                      <SelectItem value="cpf_cnpj">CPF/CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="key_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave PIX</FormLabel>
                  <FormControl>
                    <Input placeholder="Insira a chave PIX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="owner_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Titular</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Banco</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Banco do Brasil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Salvar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}