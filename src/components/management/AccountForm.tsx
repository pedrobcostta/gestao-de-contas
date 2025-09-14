import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Account } from "@/types";
import { showError, showSuccess } from "@/utils/toast";

const accountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório."),
  due_date: z.date({ required_error: "Data de vencimento é obrigatória." }),
  total_value: z.coerce.number().positive("O valor deve ser positivo."),
  status: z.enum(["pago", "pendente", "vencido"]),
  purchase_type: z.enum(["unica", "parcelada"]),
});

interface AccountFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account: Account | null;
  managementType: Account["management_type"];
}

export function AccountForm({ isOpen, setIsOpen, account, managementType }: AccountFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      total_value: 0,
      status: "pendente",
      purchase_type: "unica",
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        due_date: new Date(account.due_date),
        total_value: account.total_value,
        status: account.status,
        purchase_type: account.purchase_type,
      });
    } else {
      form.reset({
        name: "",
        due_date: new Date(),
        total_value: 0,
        status: "pendente",
        purchase_type: "unica",
      });
    }
  }, [account, form]);

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Você precisa estar logado.");
      return;
    }

    const accountData = {
      ...values,
      due_date: format(values.due_date, "yyyy-MM-dd"),
      user_id: user.id,
      management_type: managementType,
    };

    const { error } = account
      ? await supabase.from("accounts").update(accountData).eq("id", account.id)
      : await supabase.from("accounts").insert(accountData);

    if (error) {
      showError(`Erro ao salvar conta: ${error.message}`);
    } else {
      showSuccess(`Conta ${account ? 'atualizada' : 'criada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['accounts', managementType] });
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta" : "Adicionar Nova Conta"}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da conta abaixo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Conta de Luz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="total_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Total</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Escolha uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="purchase_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Compra</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unica">Única</SelectItem>
                      <SelectItem value="parcelada">Parcelada</SelectItem>
                    </SelectContent>
                  </Select>
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