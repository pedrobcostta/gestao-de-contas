import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Account, BankAccount } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";
import { CurrencyInput } from "@/components/CurrencyInput";
import { NumericInput } from "@/components/ui/numeric-input";
import { generateAccountPdf } from "@/utils/pdfGenerator";
import { PdfOptionsForm } from "./PdfOptionsForm";

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  total_value: z.coerce.number().min(0.01, "O valor deve ser maior que zero."),
  due_date: z.date({ required_error: "A data de vencimento é obrigatória." }),
  status: z.enum(["pendente", "pago", "vencido"]),
  account_type: z.enum(["unica", "parcelada", "recorrente"]),
  
  is_total_value: z.boolean().default(false),
  installments_total: z.coerce.number().min(2).max(999).optional(),
  initial_installment: z.coerce.number().min(1).optional(),

  recurrence_end_date: z.date().optional().nullable(),
  recurrence_indefinite: z.boolean().default(false),
  
  payment_date: z.date().optional().nullable(),
  payment_method: z.enum(["dinheiro", "pix", "boleto", "transferencia", "cartao"]).optional().nullable(),
  payment_bank_id: z.string().optional().nullable(),
  
  fees_and_fines: z.coerce.number().optional().nullable(),

  notes: z.string().optional().nullable(),
  bill_proof: z.instanceof(FileList).optional(),
  payment_proof: z.instanceof(FileList).optional(),

  generate_bill_proof: z.boolean().default(false),
  pdf_options: z.object({
    include_name: z.boolean().default(true),
    include_total_value: z.boolean().default(true),
    include_due_date: z.boolean().default(true),
    include_status: z.boolean().default(true),
    include_account_type: z.boolean().default(true),
    include_installments: z.boolean().default(true),
    include_payment_date: z.boolean().default(true),
    include_payment_method: z.boolean().default(true),
    include_payment_bank: z.boolean().default(true),
    include_fees_and_fines: z.boolean().default(true),
    include_notes: z.boolean().default(true),
    include_bill_proof: z.boolean().default(true),
    include_payment_proof: z.boolean().default(true),
    include_owner_signature: z.boolean().default(false),
    include_recipient_signature: z.boolean().default(false),
  }).optional(),
}).refine(data => {
    if (data.account_type === 'parcelada' && !data.installments_total) {
        return false;
    }
    return true;
}, {
    message: "O total de parcelas é obrigatório.",
    path: ["installments_total"],
}).refine(data => {
    if (data.account_type === 'parcelada') {
        return data.initial_installment && data.installments_total && data.initial_installment <= data.installments_total;
    }
    return true;
}, {
    message: "A parcela inicial não pode ser maior que o total de parcelas.",
    path: ["initial_installment"],
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
      account_type: "unica",
      status: "pendente",
      recurrence_indefinite: true,
      installments_total: 2,
      initial_installment: 1,
      generate_bill_proof: false,
      pdf_options: {
        include_name: true,
        include_total_value: true,
        include_due_date: true,
        include_status: true,
        include_account_type: true,
        include_installments: true,
        include_payment_date: true,
        include_payment_method: true,
        include_payment_bank: true,
        include_fees_and_fines: true,
        include_notes: true,
        include_bill_proof: true,
        include_payment_proof: true,
        include_owner_signature: false,
        include_recipient_signature: false,
      }
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank_accounts', managementType],
    queryFn: async (): Promise<BankAccount[]> => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('management_type', managementType);
      
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const accountType = form.watch("account_type");
  const status = form.watch("status");
  const paymentMethod = form.watch("payment_method");
  const generateBillProof = form.watch("generate_bill_proof");

  useEffect(() => {
    if (account) {
      form.reset({
        ...account,
        due_date: new Date(`${account.due_date}T00:00:00`),
        payment_date: account.payment_date ? new Date(`${account.payment_date}T00:00:00`) : null,
        total_value: account.account_type === 'parcelada' && account.installment_value ? account.installment_value : account.total_value,
        recurrence_end_date: account.recurrence_end_date ? new Date(`${account.recurrence_end_date}T00:00:00`) : null,
        recurrence_indefinite: !account.recurrence_end_date,
      });
    } else {
      form.reset({
        name: "",
        total_value: 0,
        due_date: new Date(),
        status: "pendente",
        account_type: "unica",
        installments_total: 2,
        initial_installment: 1,
        payment_date: null,
        payment_method: undefined,
        notes: "",
        recurrence_indefinite: true,
        generate_bill_proof: false,
      });
    }
  }, [account, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);

    try {
      let original_bill_proof_url = account?.bill_proof_url || null;
      if (values.bill_proof && values.bill_proof.length > 0) {
        original_bill_proof_url = await uploadFile(values.bill_proof[0], session.user.id);
      }

      let original_payment_proof_url = account?.payment_proof_url || null;
      if (values.payment_proof && values.payment_proof.length > 0) {
        original_payment_proof_url = await uploadFile(values.payment_proof[0], session.user.id);
      }

      let final_bill_proof_url = original_bill_proof_url;

      if (values.generate_bill_proof) {
        const accountDataForPdf = {
          ...values,
          due_date: format(values.due_date, "yyyy-MM-dd"),
          payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
          bill_proof_url_original: original_bill_proof_url,
          payment_proof_url_original: original_payment_proof_url,
        };
        
        const pdfFile = await generateAccountPdf(accountDataForPdf, bankAccounts, values.pdf_options!);
        final_bill_proof_url = await uploadFile(pdfFile, session.user.id);
      }

      const recurrence_end_date = values.account_type === 'recorrente' && !values.recurrence_indefinite ? format(values.recurrence_end_date!, "yyyy-MM-dd") : null;

      const dbData = {
        name: values.name,
        total_value: values.total_value,
        due_date: format(values.due_date, "yyyy-MM-dd"),
        status: values.status,
        account_type: values.account_type,
        payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
        payment_method: values.payment_method,
        payment_bank_id: values.payment_bank_id,
        fees_and_fines: values.fees_and_fines,
        notes: values.notes,
        bill_proof_url: final_bill_proof_url,
        payment_proof_url: original_payment_proof_url,
        recurrence_end_date: recurrence_end_date,
        installment_value: values.account_type === 'parcelada' ? values.total_value : null,
      };

      if (account) { // EDIT
        const { error } = await supabase
          .from("accounts")
          .update(dbData)
          .eq("id", account.id);
        if (error) throw error;
        showSuccess("Conta atualizada com sucesso!");
      } else { // CREATE
        if (values.account_type === 'parcelada' && values.installments_total && values.installments_total > 1) {
          const groupId = uuidv4();
          const initial_installment = values.initial_installment || 1;
          const installmentsToCreate = values.installments_total - initial_installment + 1;

          let installmentValue = 0;
          if (values.is_total_value) {
            installmentValue = parseFloat((values.total_value / values.installments_total).toFixed(2));
          } else {
            installmentValue = values.total_value;
          }

          const newAccounts = Array.from({ length: installmentsToCreate }).map((_, i) => {
            const currentInstallmentNumber = initial_installment + i;
            const dueDate = new Date(values.due_date);
            dueDate.setMonth(dueDate.getMonth() + i);
            return {
              user_id: session.user.id,
              management_type: managementType,
              name: `${values.name} ${currentInstallmentNumber}/${values.installments_total}`,
              due_date: format(dueDate, "yyyy-MM-dd"),
              total_value: installmentValue,
              account_type: 'parcelada',
              installments_total: values.installments_total,
              installment_current: currentInstallmentNumber,
              installment_value: installmentValue,
              status: 'pendente',
              notes: values.notes,
              group_id: groupId,
              bill_proof_url: final_bill_proof_url,
            };
          });
          const { error } = await supabase.from('accounts').insert(newAccounts);
          if (error) throw error;
          showSuccess(`${installmentsToCreate} parcelas criadas com sucesso!`);
        } else {
          const { error } = await supabase.from("accounts").insert([
            {
              ...dbData,
              user_id: session.user.id,
              management_type: managementType,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: Compra de TV" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="total_value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      placeholder="R$ 0,00"
                      value={field.value || 0}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento {accountType === 'parcelada' ? 'da 1ª Parcela' : ''}</FormLabel>
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
              {status === 'vencido' && (
                <FormField control={form.control} name="fees_and_fines" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Juros e Multas</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder="R$ 0,00"
                        value={field.value || 0}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="account_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conta</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!account}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="unica">Única</SelectItem>
                      <SelectItem value="parcelada">Parcelada</SelectItem>
                      <SelectItem value="recorrente">Recorrente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {accountType === 'parcelada' && !account && (
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                  <FormField control={form.control} name="installments_total" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total de Parcelas</FormLabel>
                      <FormControl><NumericInput {...field} min={2} max={999} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="initial_installment" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parcela Inicial</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="is_total_value" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 pt-6 col-span-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>O valor informado é o total da compra (não da parcela)</FormLabel>
                    </FormItem>
                  )} />
                </div>
              )}
              {accountType === 'recorrente' && (
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 border p-4 rounded-md">
                  <FormField control={form.control} name="recurrence_end_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Final da Recorrência</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={form.watch('recurrence_indefinite')}>
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
                  <FormField control={form.control} name="recurrence_indefinite" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 pt-6">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Sem data de término</FormLabel>
                    </FormItem>
                  )} />
                </div>
              )}
              {status === 'pago' && (
                <>
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
                      <FormLabel>Modo de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="cartao">Cartão de Crédito/Débito</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {paymentMethod && paymentMethod !== 'dinheiro' && (
                    <FormField control={form.control} name="payment_bank_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o banco..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {bankAccounts.map(bank => (
                              <SelectItem key={bank.id} value={bank.id}>{bank.account_name} - {bank.bank_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <FormField control={form.control} name="payment_proof" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comprovante de Pagamento</FormLabel>
                      <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}
              <FormField control={form.control} name="bill_proof" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fatura / Conta</FormLabel>
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
            <FormField
              control={form.control}
              name="generate_bill_proof"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 pt-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Gerar fatura/conta em PDF</FormLabel>
                </FormItem>
              )}
            />
            {generateBillProof && <PdfOptionsForm />}
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