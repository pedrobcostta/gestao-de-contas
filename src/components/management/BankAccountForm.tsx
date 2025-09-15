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
import { supabase } from "@/integrations/supabase/client";
import { BankAccount } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";

const formSchema = z.object({
  account_type: z.enum(["conta_corrente", "poupanca", "cartao_credito"]),
  account_name: z.string().min(1, "O nome da conta é obrigatório."),
  bank_name: z.string().min(1, "O nome do banco é obrigatório."),
  agency: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  card_limit: z.coerce.number().optional().nullable(),
  card_closing_day: z.coerce.number().min(1, "O dia deve ser no mínimo 1.").max(31, "O dia deve ser no máximo 31.").optional().nullable(),
  card_due_day: z.coerce.number().min(1, "O dia deve ser no mínimo 1.").max(31, "O dia deve ser no máximo 31.").optional().nullable(),
});

interface BankAccountFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  bankAccount?: BankAccount | null;
  managementType: BankAccount["management_type"];
}

export function BankAccountForm({ isOpen, setIsOpen, bankAccount, managementType }: BankAccountFormProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const accountType = form.watch("account_type");

  useEffect(() => {
    if (bankAccount) {
      form.reset(bankAccount);
    } else {
      form.reset({
        account_type: "conta_corrente",
        account_name: "",
        bank_name: "",
      });
    }
  }, [bankAccount, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);

    try {
      if (bankAccount) {
        const { error } = await supabase
          .from("bank_accounts")
          .update(values)
          .eq("id", bankAccount.id);
        if (error) throw error;
        showSuccess("Conta atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("bank_accounts").insert([
          {
            ...values,
            user_id: session.user.id,
            management_type: managementType,
          },
        ]);
        if (error) throw error;
        showSuccess("Conta criada com sucesso!");
      }
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      setIsOpen(false);
    } catch (error: any) {
      showError(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bankAccount ? "Editar Conta" : "Adicionar Nova Conta/Cartão"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="account_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="account_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Conta/Cartão</FormLabel>
                <FormControl><Input placeholder="Ex: Conta Principal" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bank_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Banco</FormLabel>
                <FormControl><Input placeholder="Ex: Banco Digital" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {accountType === 'cartao_credito' ? (
              <>
                <FormField control={form.control} name="card_limit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite do Cartão</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="card_closing_day" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Fechamento</FormLabel>
                    <FormControl><Input type="number" min="1" max="31" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="card_due_day" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Vencimento</FormLabel>
                    <FormControl><Input type="number" min="1" max="31" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            ) : (
              <>
                <FormField control={form.control} name="agency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agência</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="account_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Conta</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}
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