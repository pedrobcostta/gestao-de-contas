import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Account } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  total_value: z.coerce.number().min(0.01, "O valor deve ser maior que zero."),
  due_date: z.date({ required_error: "A data de vencimento é obrigatória." }),
  status: z.enum(["pendente", "pago", "vencido"]),
  purchase_type: z.enum(["unica", "parcelada"]),
  installments_total: z.coerce.number().optional(),
  payment_date: z.date().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_recurrent: z.boolean().default(false),
  bill_proof: z.instanceof(FileList).optional(),
  payment_proof: z.instanceof(FileList).optional(),
});

interface AccountFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account?: Account | null;
  managementType: Account["management_type"];
}

async function uploadFile(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    return null;
  }

  const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
  return data.publicUrl;
}

export function AccountForm({ isOpen, setIsOpen, account, managementType }: AccountFormProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_recurrent: false,
      purchase_type: "unica",
      status: "pendente",
    },
  });

  const purchaseType = form.watch("purchase_type");

  useEffect(() => {
    if (account) {
      form.reset({
        ...account,
        due_date: new Date(account.due_date),
        payment_date: account.payment_date ? new Date(account.payment_date) : null,
        total_value: account.purchase_type === 'parcelada' ? account.installment_value : account.total_value,
      });
    } else {
      form.reset({
        name: "",
        total_value: 0,
        due_date: new Date(),
        status: "pendente",
        purchase_type: "unica",
        installments_total: 1,
        payment_date: null,
        payment_method: "",
        notes: "",
        is_recurrent: false,
      });
    }
  }, [account, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);

    try {
      let bill_proof_url = account?.bill_proof_url || null;
      if (values.bill_proof && values.bill_proof.length > 0) {
        bill_proof_url = await uploadFile(values.bill_proof[0], session.user.id);
      }

      let payment_proof_url = account?.payment_proof_url || null;
      if (values.payment_proof && values.payment_proof.length > 0) {
        payment_proof_url = await uploadFile(values.payment_proof[0], session.user.id);
      }

      if (account) { // EDIT
        const { error } = await supabase
          .from("accounts")
          .update({
            ...values,
            due_date: format(values.due_date, "yyyy-MM-dd"),
            payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
            total_value: values.total_value,
            installment_value: values.total_value,
            bill_proof_url,
            payment_proof_url,
          })
          .eq("id", account.id);
        if (error) throw error;
        showSuccess("Conta atualizada com sucesso!");
      } else { // CREATE
        if (values.purchase_type === 'parcelada' && values.installments_total && values.installments_total > 1) {
          const groupId = uuidv4();
          const newAccounts = Array.from({ length: values.installments_total }).map((_, i) => {
            const dueDate = new Date(values.due_date);
            dueDate.setMonth(dueDate.getMonth() + i);
            return {
              user_id: session.user.id,
              management_type: managementType,
              name: `${values.name} ${i + 1}/${values.installments_total}`,
              due_date: format(dueDate, "yyyy-MM-dd"),
              total_value: values.total_value,
              purchase_type: 'parcelada',
              installments_total: values.installments_total,
              installment_current: i + 1,
              installment_value: values.total_value,
              status: 'pendente',
              is_recurrent: values.is_recurrent,
              notes: values.notes,
              group_id: groupId,
              bill_proof_url,
            };
          });
          const { error } = await supabase.from('accounts').insert(newAccounts);
          if (error) throw error;
          showSuccess(`${values.installments_total} parcelas criadas com sucesso!`);
        } else {
          const { error } = await supabase.from("accounts").insert([
            {
              ...values,
              due_date: format(values.due_date, "yyyy-MM-dd"),
              payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
              user_id: session.user.id,
              management_type: managementType,
              bill_proof_url,
              payment_proof_url,
            },
          ]);
          if (error) throw error;
          showSuccess("Conta criada com sucesso!");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsOpen(false);
    } catch (error: any) {
      showError(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta" : "Adicionar Nova Conta"}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da conta abaixo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: Conta de Luz" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="total_value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="purchase_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Compra</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!account}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="unica">Única</SelectItem>
                      <SelectItem value="parcelada">Parcelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {purchaseType === 'parcelada' && !account && (
                <FormField control={form.control} name="installments_total" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de Parcelas</FormLabel>
                    <FormControl><Input type="number" min="2" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="payment_date" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Pagamento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="payment_method" render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pagamento</FormLabel>
                  <FormControl><Input placeholder="Ex: Cartão de Crédito" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bill_proof" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fatura / Conta</FormLabel>
                  <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="payment_proof" render={({ field }) => (
                <FormItem>
                  <FormLabel>Comprovante de Pagamento</FormLabel>
                  <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea placeholder="Qualquer detalhe adicional..." {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="is_recurrent" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Conta Recorrente?</FormLabel>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {account ? "Salvar Alterações" : "Criar Conta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}