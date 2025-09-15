import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, PlusCircle, XCircle } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Account, BankAccount, Profile, CustomAttachment } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";
import { CurrencyInput } from "@/components/CurrencyInput";
import { NumericInput } from "@/components/ui/numeric-input";
import { generateCustomBillPdf, generateFullReportPdf } from "@/utils/pdfGenerator";
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
  other_attachments_form: z.array(z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    file: z.instanceof(FileList).refine(files => files.length > 0, "Arquivo é obrigatório"),
  })).optional(),
  generate_bill_proof: z.boolean().default(false),
  pdf_options: z.any().optional(),
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
  const { error } = await supabase.storage.from('attachments').upload(filePath, file);
  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }
  const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
  return data.publicUrl;
}

export function AccountForm({ isOpen, setIsOpen, account, managementType }: AccountFormProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [last4Digits, setLast4Digits] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_type: "unica",
      status: "pendente",
      recurrence_indefinite: true,
      installments_total: 2,
      initial_installment: 1,
      generate_bill_proof: false,
      other_attachments_form: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "other_attachments_form",
  });

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) { console.error("Error fetching profile:", error); return null; }
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['bank_accounts', managementType],
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts').select('*').eq('management_type', managementType);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!managementType,
  });

  const accountType = form.watch("account_type");
  const status = form.watch("status");
  const paymentMethod = form.watch("payment_method");
  const paymentBankId = form.watch("payment_bank_id");
  const generateBillProof = form.watch("generate_bill_proof");
  const selectedBank = bankAccounts.find(b => b.id === paymentBankId);

  useEffect(() => {
    if (account) {
      form.reset({
        ...account,
        due_date: new Date(`${account.due_date}T00:00:00`),
        payment_date: account.payment_date ? new Date(`${account.payment_date}T00:00:00`) : null,
        total_value: account.account_type === 'parcelada' && account.installment_value ? account.installment_value : account.total_value,
        recurrence_end_date: account.recurrence_end_date ? new Date(`${account.recurrence_end_date}T00:00:00`) : null,
        recurrence_indefinite: !account.recurrence_end_date,
        other_attachments_form: [],
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
        other_attachments_form: [],
      });
    }
  }, [account, form, isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);

    try {
      const bill_proof_url = values.bill_proof?.[0] ? await uploadFile(values.bill_proof[0], session.user.id) : account?.bill_proof_url || null;
      const payment_proof_url = values.payment_proof?.[0] ? await uploadFile(values.payment_proof[0], session.user.id) : account?.payment_proof_url || null;
      
      const other_attachments: CustomAttachment[] = account?.other_attachments || [];
      if (values.other_attachments_form) {
        for (const attachment of values.other_attachments_form) {
          if (attachment.file && attachment.file.length > 0) {
            const url = await uploadFile(attachment.file[0], session.user.id);
            if (url) other_attachments.push({ name: attachment.name, url });
          }
        }
      }

      const basePdfData = { ...values, bill_proof_url, payment_proof_url, other_attachments };

      let system_generated_bill_url = account?.system_generated_bill_url || null;
      if (values.generate_bill_proof) {
        const pdfFile = await generateCustomBillPdf(basePdfData, bankAccounts, profile, last4Digits, values.pdf_options);
        system_generated_bill_url = await uploadFile(pdfFile, session.user.id);
      }

      const commonDbData = {
        name: values.name,
        status: values.status,
        account_type: values.account_type,
        payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
        payment_method: values.payment_method,
        payment_bank_id: values.payment_bank_id,
        fees_and_fines: values.fees_and_fines,
        notes: values.notes,
        bill_proof_url,
        payment_proof_url,
        other_attachments,
        system_generated_bill_url,
        recurrence_end_date: values.account_type === 'recorrente' && !values.recurrence_indefinite ? format(values.recurrence_end_date!, "yyyy-MM-dd") : null,
      };

      if (account) {
        const reportPdfFile = await generateFullReportPdf({ ...account, ...commonDbData }, []);
        const full_report_url = await uploadFile(reportPdfFile, session.user.id);
        const updateData = { ...commonDbData, total_value: values.total_value, due_date: format(values.due_date, "yyyy-MM-dd"), installment_value: values.account_type === 'parcelada' ? values.total_value : null, full_report_url };
        const { error } = await supabase.from("accounts").update(updateData).eq("id", account.id);
        if (error) throw error;
        showSuccess("Conta atualizada com sucesso!");
      } else {
        if (values.account_type === 'parcelada' && values.installments_total) {
          const groupId = uuidv4();
          const installmentValue = values.is_total_value ? values.total_value / values.installments_total : values.total_value;
          const initialInstallment = values.initial_installment || 1;
          const createdInstallments = [];

          for (let i = 0; i < values.installments_total; i++) {
            const currentInstallment = initialInstallment + i;
            const dueDate = new Date(values.due_date);
            dueDate.setMonth(dueDate.getMonth() + i);
            const installmentData = { ...commonDbData, user_id: session.user.id, management_type: managementType, total_value: installmentValue, installment_value: installmentValue, due_date: format(dueDate, "yyyy-MM-dd"), installments_total: values.installments_total, installment_current: currentInstallment, group_id: groupId, name: `${values.name} ${currentInstallment}/${values.installments_total}`, bill_proof_url: i === 0 ? bill_proof_url : null, other_attachments: i === 0 ? other_attachments : null, system_generated_bill_url: i === 0 ? system_generated_bill_url : null };
            createdInstallments.push(installmentData);
          }
          
          const reportPdfFile = await generateFullReportPdf(createdInstallments[0], createdInstallments);
          const full_report_url = await uploadFile(reportPdfFile, session.user.id);
          if (createdInstallments.length > 0) {
            createdInstallments[0].full_report_url = full_report_url;
          }

          const { error } = await supabase.from("accounts").insert(createdInstallments);
          if (error) throw error;
          showSuccess("Contas parceladas criadas com sucesso!");
        } else {
          const reportPdfFile = await generateFullReportPdf({ ...commonDbData, total_value: values.total_value, due_date: format(values.due_date, "yyyy-MM-dd") }, []);
          const full_report_url = await uploadFile(reportPdfFile, session.user.id);
          const insertData = { ...commonDbData, user_id: session.user.id, management_type: managementType, total_value: values.total_value, due_date: format(values.due_date, "yyyy-MM-dd"), full_report_url };
          const { error } = await supabase.from("accounts").insert([insertData]);
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta" : "Adicionar Nova Conta"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome</FormLabel> <FormControl><Input placeholder="Ex: Compra de TV" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="total_value" render={({ field }) => ( <FormItem> <FormLabel>Valor</FormLabel> <FormControl> <CurrencyInput placeholder="R$ 0,00" value={field.value || 0} onValueChange={field.onChange} /> </FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="due_date" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Data de Vencimento</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}> {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="pendente">Pendente</SelectItem> <SelectItem value="pago">Pago</SelectItem> <SelectItem value="vencido">Vencido</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
              {status === 'vencido' && ( <FormField control={form.control} name="fees_and_fines" render={({ field }) => ( <FormItem> <FormLabel>Juros e Multas</FormLabel> <FormControl> <CurrencyInput placeholder="R$ 0,00" value={field.value || 0} onValueChange={field.onChange} /> </FormControl> <FormMessage /> </FormItem> )} /> )}
              <FormField control={form.control} name="account_type" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Conta</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!account}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="unica">Única</SelectItem> <SelectItem value="parcelada">Parcelada</SelectItem> <SelectItem value="recorrente">Recorrente</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
              {accountType === 'parcelada' && !account && ( <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md"> <FormField control={form.control} name="installments_total" render={({ field }) => ( <FormItem> <FormLabel>Total de Parcelas</FormLabel> <FormControl><NumericInput {...field} min={2} max={999} /></FormControl> <FormMessage /> </FormItem> )} /> <FormField control={form.control} name="initial_installment" render={({ field }) => ( <FormItem> <FormLabel>Parcela Inicial</FormLabel> <FormControl><Input type="number" min="1" {...field} /></FormControl> <FormMessage /> </FormItem> )} /> <FormField control={form.control} name="is_total_value" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2 pt-6 col-span-2"> <FormControl> <Checkbox checked={field.value} onCheckedChange={field.onChange} /> </FormControl> <FormLabel>O valor informado é o total da compra</FormLabel> </FormItem> )} /> </div> )}
              {accountType === 'recorrente' && ( <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 border p-4 rounded-md"> <FormField control={form.control} name="recurrence_end_date" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Data Final</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={form.watch('recurrence_indefinite')}> {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )} /> <FormField control={form.control} name="recurrence_indefinite" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2 pt-6"> <FormControl> <Checkbox checked={field.value} onCheckedChange={field.onChange} /> </FormControl> <FormLabel>Sem data de término</FormLabel> </FormItem> )} /> </div> )}
              {status === 'pago' && ( <> <FormField control={form.control} name="payment_date" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Data de Pagamento</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}> {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )} /> <FormField control={form.control} name="payment_method" render={({ field }) => ( <FormItem> <FormLabel>Modo de Pagamento</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="dinheiro">Dinheiro</SelectItem> <SelectItem value="pix">Pix</SelectItem> <SelectItem value="boleto">Boleto</SelectItem> <SelectItem value="transferencia">Transferência</SelectItem> <SelectItem value="cartao">Cartão</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} /> {paymentMethod && paymentMethod !== 'dinheiro' && ( <FormField control={form.control} name="payment_bank_id" render={({ field }) => ( <FormItem> <FormLabel>Banco de Pagamento</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Selecione o banco..." /></SelectTrigger></FormControl> <SelectContent> {bankAccounts.map(bank => ( <SelectItem key={bank.id} value={bank.id}>{bank.account_name} - {bank.bank_name}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )} /> )} {selectedBank?.account_type === 'cartao_credito' && ( <FormItem> <FormLabel>Últimos 4 dígitos</FormLabel> <FormControl> <Input placeholder="1234" value={last4Digits} onChange={(e) => setLast4Digits(e.target.value)} /> </FormControl> </FormItem> )} <FormField control={form.control} name="payment_proof" render={({ field }) => ( <FormItem> <FormLabel>Comprovante de Pagamento</FormLabel> <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} /></FormControl> <FormMessage /> </FormItem> )} /> </> )}
              <FormField control={form.control} name="bill_proof" render={({ field }) => ( <FormItem> <FormLabel>Fatura / Conta</FormLabel> <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} /></FormControl> <FormMessage /> </FormItem> )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Observações</FormLabel> <FormControl><Textarea placeholder="Qualquer detalhe adicional..." {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
            <div className="col-span-1 md:col-span-2 space-y-2">
              <FormLabel>Outros Anexos</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                  <FormField control={form.control} name={`other_attachments_form.${index}.name`} render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl><Input {...field} placeholder="Nome do anexo" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`other_attachments_form.${index}.file`} render={({ field: { onChange, ...rest } }) => (
                    <FormItem className="flex-grow">
                      <FormControl><Input type="file" onChange={(e) => onChange(e.target.files)} {...rest} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <XCircle className="h-5 w-5 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', file: new DataTransfer().files })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Anexo
              </Button>
            </div>
            <FormField control={form.control} name="generate_bill_proof" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2 pt-2"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> <FormLabel>Gerar fatura/conta customizada em PDF</FormLabel> </FormItem> )} />
            {generateBillProof && <PdfOptionsForm />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}> {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}