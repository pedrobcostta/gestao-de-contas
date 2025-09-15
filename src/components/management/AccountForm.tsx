import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Account, BankAccount, Profile, CustomAttachment } from "@/types";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyInput } from "@/components/CurrencyInput";
import { PdfOptionsForm } from "./PdfOptionsForm";
import { generateCustomBillPdf, generateFullReportPdf } from "@/utils/pdfGenerator";
import { Checkbox } from "../ui/checkbox";

const formSchema = z.object({
  name: z.string().min(1, "O nome da conta é obrigatório."),
  total_value: z.number().min(0.01, "O valor deve ser maior que zero."),
  due_date: z.date({ required_error: "A data de vencimento é obrigatória." }),
  account_type: z.enum(["unica", "parcelada", "recorrente"]),
  installments_total: z.coerce.number().optional(),
  recurrence_end_date: z.date().optional(),
  status: z.enum(["pendente", "pago", "vencido"]),
  payment_date: z.date().optional().nullable(),
  payment_method: z.enum(["dinheiro", "pix", "boleto", "transferencia", "cartao"]).optional().nullable(),
  payment_bank_id: z.string().optional().nullable(),
  card_last_4_digits: z.string().optional().nullable(),
  fees_and_fines: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  bill_proof: z.instanceof(File).optional().nullable(),
  payment_proof: z.instanceof(File).optional().nullable(),
  other_attachments_files: z.array(z.instanceof(File)).optional(),
  generate_system_bill: z.boolean().default(false),
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
  }).default({}),
}).refine(data => {
  if (data.account_type === 'parcelada') {
    return data.installments_total && data.installments_total > 1;
  }
  return true;
}, {
  message: "O número de parcelas deve ser maior que 1.",
  path: ["installments_total"],
}).refine(data => {
  if (data.account_type === 'recorrente') {
    return !!data.recurrence_end_date;
  }
  return true;
}, {
  message: "A data final da recorrência é obrigatória.",
  path: ["recurrence_end_date"],
});

interface AccountFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account?: Account | null;
  managementType: Account["management_type"];
}

export function AccountForm({ isOpen, setIsOpen, account, managementType }: AccountFormProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['bank_accounts', managementType],
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts').select('*').eq('management_type', managementType);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) { console.error(error); return null; }
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_type: 'unica',
      status: 'pendente',
      generate_system_bill: false,
      pdf_options: {
        include_name: true, include_total_value: true, include_due_date: true, include_status: true,
        include_account_type: true, include_installments: true, include_payment_date: true,
        include_payment_method: true, include_payment_bank: true, include_fees_and_fines: true,
        include_notes: true, include_bill_proof: true, include_payment_proof: true,
        include_owner_signature: false, include_recipient_signature: false,
      },
    },
  });

  const accountType = form.watch("account_type");
  const status = form.watch("status");
  const paymentBankId = form.watch("payment_bank_id");
  const generateSystemBill = form.watch("generate_system_bill");
  const selectedPaymentBank = bankAccounts.find(b => b.id === paymentBankId);

  useEffect(() => {
    if (account) {
      form.reset({
        ...account,
        due_date: new Date(`${account.due_date}T00:00:00`),
        payment_date: account.payment_date ? new Date(`${account.payment_date}T00:00:00`) : null,
        recurrence_end_date: account.recurrence_end_date ? new Date(`${account.recurrence_end_date}T00:00:00`) : undefined,
        total_value: account.total_value || 0,
        fees_and_fines: account.fees_and_fines || undefined,
        generate_system_bill: !!account.system_generated_bill_url,
      });
    } else {
      form.reset({
        name: "",
        total_value: 0,
        due_date: new Date(),
        account_type: 'unica',
        status: 'pendente',
        installments_total: undefined,
        recurrence_end_date: undefined,
        payment_date: null,
        payment_method: null,
        payment_bank_id: null,
        fees_and_fines: undefined,
        notes: "",
        generate_system_bill: false,
      });
    }
  }, [account, form, isOpen]);

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    if (!session?.user) return null;
    const filePath = `${session.user.id}/${uuidv4()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) {
      showError(`Erro no upload do arquivo: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);
    const toastId = showLoading("Salvando conta...");

    try {
      const {
        bill_proof,
        payment_proof,
        other_attachments_files,
        generate_system_bill,
        pdf_options,
        ...dbData
      } = values;

      let billProofUrl = account?.bill_proof_url;
      if (bill_proof) {
        billProofUrl = await uploadFile(bill_proof, 'attachments');
      }

      let paymentProofUrl = account?.payment_proof_url;
      if (payment_proof) {
        paymentProofUrl = await uploadFile(payment_proof, 'attachments');
      }

      const otherAttachments: CustomAttachment[] = account?.other_attachments || [];
      if (other_attachments_files) {
        for (const file of other_attachments_files) {
          const url = await uploadFile(file, 'attachments');
          if (url) {
            otherAttachments.push({ name: file.name, url });
          }
        }
      }

      const baseAccountData = {
        ...dbData,
        user_id: session.user.id,
        management_type: managementType,
        due_date: format(values.due_date, "yyyy-MM-dd"),
        payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
        bill_proof_url: billProofUrl,
        payment_proof_url: paymentProofUrl,
        other_attachments: otherAttachments,
      };

      let systemGeneratedBillUrl = account?.system_generated_bill_url;
      if (generate_system_bill) {
        const pdfDataForGeneration = {
          ...baseAccountData,
          due_date: values.due_date,
          payment_date: values.payment_date,
          bill_proof_url_original: billProofUrl,
          payment_proof_url_original: paymentProofUrl,
        };
        const systemGeneratedBillFile = await generateCustomBillPdf(pdfDataForGeneration, bankAccounts, profile, values.card_last_4_digits || '', pdf_options);
        systemGeneratedBillUrl = await uploadFile(systemGeneratedBillFile, 'generated-bills');
      } else {
        systemGeneratedBillUrl = null;
      }
      
      const finalBaseAccountData = { ...baseAccountData, system_generated_bill_url: systemGeneratedBillUrl };

      if (account) { // UPDATE
        const { error } = await supabase.from("accounts").update(finalBaseAccountData).eq("id", account.id);
        if (error) throw error;
        
        const fullReportFile = await generateFullReportPdf(finalBaseAccountData, []);
        const fullReportUrl = await uploadFile(fullReportFile, 'generated-reports');
        await supabase.from('accounts').update({ full_report_url: fullReportUrl }).eq('id', account.id);

        showSuccess("Conta atualizada com sucesso!");
      } else { // CREATE
        const groupId = uuidv4();
        if (values.account_type === 'parcelada' && values.installments_total) {
          const newAccounts = [];
          const installmentValue = values.total_value / values.installments_total;
          for (let i = 1; i <= values.installments_total; i++) {
            newAccounts.push({
              ...finalBaseAccountData,
              name: `${values.name} ${i}/${values.installments_total}`,
              due_date: format(addMonths(values.due_date, i - 1), "yyyy-MM-dd"),
              total_value: values.total_value,
              installment_current: i,
              installments_total: values.installments_total,
              installment_value: installmentValue,
              group_id: groupId,
            });
          }
          const { error } = await supabase.from("accounts").insert(newAccounts);
          if (error) throw error;

          const fullReportFile = await generateFullReportPdf(finalBaseAccountData, newAccounts);
          const fullReportUrl = await uploadFile(fullReportFile, 'generated-reports');
          await supabase.from('accounts').update({ full_report_url: fullReportUrl }).eq('group_id', groupId);

        } else if (values.account_type === 'recorrente' && values.recurrence_end_date) {
          const newAccounts = [];
          let currentDate = values.due_date;
          while (currentDate <= values.recurrence_end_date) {
            newAccounts.push({
              ...finalBaseAccountData,
              due_date: format(currentDate, "yyyy-MM-dd"),
              group_id: groupId,
            });
            currentDate = addMonths(currentDate, 1);
          }
          const { error } = await supabase.from("accounts").insert(newAccounts);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from("accounts").insert([{ ...finalBaseAccountData, group_id: groupId }]).select().single();
          if (error) throw error;
          
          const fullReportFile = await generateFullReportPdf(finalBaseAccountData, []);
          const fullReportUrl = await uploadFile(fullReportFile, 'generated-reports');
          await supabase.from('accounts').update({ full_report_url: fullReportUrl }).eq('id', data.id);
        }
        showSuccess("Conta(s) criada(s) com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsOpen(false);
    } catch (error: any) {
      showError(`Erro: ${error.message}`);
    } finally {
      dismissToast(toastId);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta" : "Adicionar Nova Conta"}</DialogTitle>
          <DialogDescription>Preencha os detalhes da conta abaixo.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Conta</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="total_value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total</FormLabel>
                    <FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl>
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
                {accountType === 'parcelada' && (
                  <FormField control={form.control} name="installments_total" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Parcelas</FormLabel>
                      <FormControl><Input type="number" {...field} disabled={!!account} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                {accountType === 'recorrente' && (
                  <FormField control={form.control} name="recurrence_end_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Final da Recorrência</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!!account}>
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
                )}
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {/* Right Column */}
              <div className="space-y-4">
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
                        <FormLabel>Método de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="boleto">Boleto</SelectItem>
                            <SelectItem value="transferencia">Transferência</SelectItem>
                            <SelectItem value="cartao">Cartão</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="payment_bank_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta/Cartão de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.account_name} - {b.bank_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {selectedPaymentBank?.account_type === 'cartao_credito' && (
                      <FormField control={form.control} name="card_last_4_digits" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Últimos 4 dígitos do cartão</FormLabel>
                          <FormControl><Input {...field} maxLength={4} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </>
                )}
                <FormField control={form.control} name="fees_and_fines" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Juros e Multas</FormLabel>
                    <FormControl><CurrencyInput value={field.value || 0} onValueChange={field.onChange} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {/* Attachments */}
              <div className="col-span-1 md:col-span-2 space-y-4 border p-4 rounded-md">
                <h3 className="text-md font-semibold">Anexos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="bill_proof" render={({ field: { onChange, ...props } }) => (
                    <FormItem>
                      <FormLabel>Fatura / Conta</FormLabel>
                      <FormControl>
                        <Input type="file" {...props} onChange={(e) => onChange(e.target.files?.[0])} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {status === 'pago' && (
                    <FormField control={form.control} name="payment_proof" render={({ field: { onChange, ...props } }) => (
                      <FormItem>
                        <FormLabel>Comprovante de Pagamento</FormLabel>
                        <FormControl>
                          <Input type="file" {...props} onChange={(e) => onChange(e.target.files?.[0])} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              </div>
              {/* PDF Options */}
              <div className="col-span-1 md:col-span-2 space-y-4">
                <FormField
                  control={form.control}
                  name="generate_system_bill"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Gerar Fatura/Conta em PDF
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                {generateSystemBill && <PdfOptionsForm />}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}