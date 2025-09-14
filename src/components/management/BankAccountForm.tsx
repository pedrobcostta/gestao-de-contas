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
import { BankAccount } from "@/types";
import { showError, showSuccess } from "@/utils/toast";

const bankAccountSchema = z.object({
  account_type: z.enum(["conta_corrente", "poupanca", "cartao_credito"]),
  account_name: z.string().min(1, "O nome da conta é obrigatório."),
  bank_name: z.string().min(1, "O nome do banco é obrigatório."),
  agency: z.string().optional(),
  account_number: z.string().optional(),
  card_limit: z.coerce.number().optional(),
  card_closing_day: z.coerce.number().optional(),
  card_due_day: z.coerce.number().optional(),
});

interface BankAccountFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  bankAccount: BankAccount | null;
  managementType: BankAccount["management_type"];
}

export function BankAccountForm({ isOpen, setIsOpen, bankAccount, managementType }: BankAccountFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof bankAccountSchema>>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      account_type: "conta_corrente",
      account_name: "",
      bank_name: "",
    },
  });

  const accountType = form.watch("account_type");

  useEffect(() => {
    if (bankAccount) {
      form.reset({
        ...bankAccount,
        card_limit: bankAccount.card_limit || undefined,
        card_closing_day: bankAccount.card_closing_day || undefined,
        card_due_day: bankAccount.card_due_day || undefined,
      });
    } else {
      form.reset({
        account_type: "conta_corrente",
        account_name: "",
        bank_name: "",
        agency: "",
        account_number: "",
        card_limit: undefined,
        card_closing_day: undefined,
        card_due_day: undefined,
      });
    }
  }, [bankAccount, form]);

  const onSubmit = async (values: z.infer<typeof bankAccountSchema>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Você precisa estar logado.");
      return;
    }

    const bankAccountData = {
      ...values,
      user_id: user.id,
      management_type: managementType,
    };

    const { error } = bankAccount
      ? await supabase.from("bank_accounts").update(bankAccountData).eq("id", bankAccount.id)
      : await supabase.from("bank_accounts").insert(bankAccountData);

    if (error) {
      showError(`Erro ao salvar conta: ${error.message}`);
    } else {
      showSuccess(`Conta ${bankAccount ? 'atualizada' : 'criada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', managementType] });
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bankAccount ? "Editar Conta" : "Adicionar Nova Conta"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conta</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="account_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conta/Cartão</FormLabel>
                  <FormControl><Input placeholder="Ex: Conta Principal" {...field} /></FormControl>
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
                  <FormControl><Input placeholder="Ex: Banco do Brasil" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {accountType !== 'cartao_credito' && (
              <>
                <FormField
                  control={form.control}
                  name="agency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agência</FormLabel>
                      <FormControl><Input placeholder="0001" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Conta</FormLabel>
                      <FormControl><Input placeholder="12345-6" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
            {accountType === 'cartao_credito' && (
              <>
                <FormField
                  control={form.control}
                  name="card_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite do Cartão</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="card_closing_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia de Fechamento</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="card_due_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia de Vencimento</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
            <Button type="submit">Salvar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}