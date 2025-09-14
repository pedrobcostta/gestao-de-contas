import { useEffect, useState } from "react";
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
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { PixKey } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";

const formSchema = z.object({
  key_type: z.enum(["cpf_cnpj", "celular", "email", "aleatoria", "br_code"]),
  key_value: z.string().min(1, "A chave PIX é obrigatória."),
  owner_name: z.string().min(1, "O nome do titular é obrigatório."),
  bank_name: z.string().min(1, "O nome do banco é obrigatório."),
});

interface PixFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  pixKey?: PixKey | null;
  managementType: PixKey["management_type"];
}

export function PixForm({ isOpen, setIsOpen, pixKey, managementType }: PixFormProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const keyType = form.watch("key_type");

  useEffect(() => {
    if (pixKey) {
      form.reset(pixKey);
    } else {
      form.reset({
        key_type: "aleatoria",
        key_value: "",
        owner_name: "",
        bank_name: "",
      });
    }
  }, [pixKey, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);

    try {
      if (pixKey) {
        const { error } = await supabase
          .from("pix_keys")
          .update(values)
          .eq("id", pixKey.id);
        if (error) throw error;
        showSuccess("Chave PIX atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("pix_keys").insert([
          {
            ...values,
            user_id: session.user.id,
            management_type: managementType,
          },
        ]);
        if (error) throw error;
        showSuccess("Chave PIX criada com sucesso!");
      }
      queryClient.invalidateQueries({ queryKey: ["pix_keys"] });
      setIsOpen(false);
    } catch (error: any) {
      showError(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pixKey ? "Editar Chave PIX" : "Adicionar Nova Chave PIX"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="key_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Chave</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="cpf_cnpj">CPF/CNPJ</SelectItem>
                    <SelectItem value="celular">Celular</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="aleatoria">Aleatória</SelectItem>
                    <SelectItem value="br_code">PIX Copia e Cola</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="key_value" render={({ field }) => (
              <FormItem>
                <FormLabel>{keyType === 'br_code' ? 'Código PIX' : 'Chave PIX'}</FormLabel>
                <FormControl>
                  {keyType === 'br_code' ? (
                    <Textarea {...field} placeholder="Cole o código PIX aqui..." />
                  ) : (
                    <Input {...field} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="owner_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Titular</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bank_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Banco</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}