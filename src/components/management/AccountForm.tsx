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

  const { data: profile } = useQuery<Profile | null>({ queryKey: ['profile', session?.user?.id], /* ... */ });
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({ queryKey: ['bank_accounts', managementType], /* ... */ });

  const accountType = form.watch("account_type");
  const status = form.watch("status");
  const paymentMethod = form.watch("payment_method");
  const paymentBankId = form.watch("payment_bank_id");
  const generateBillProof = form.watch("generate_bill_proof");
  const selectedBank = bankAccounts.find(b => b.id === paymentBankId);

  useEffect(() => {
    // Reset logic...
  }, [account, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);

    try {
      // 1. Upload all files and get URLs
      const bill_proof_url = values.bill_proof?.[0] ? await uploadFile(values.bill_proof[0], session.user.id) : account?.bill_proof_url || null;
      const payment_proof_url = values.payment_proof?.[0] ? await uploadFile(values.payment_proof[0], session.user.id) : account?.payment_proof_url || null;
      
      const other_attachments: CustomAttachment[] = account?.other_attachments || [];
      if (values.other_attachments_form) {
        for (const attachment of values.other_attachments_form) {
          const url = await uploadFile(attachment.file[0], session.user.id);
          if (url) other_attachments.push({ name: attachment.name, url });
        }
      }

      // 2. Prepare data for PDFs
      const basePdfData = {
        ...values,
        due_date: format(values.due_date, "yyyy-MM-dd"),
        payment_date: values.payment_date ? format(values.payment_date, "yyyy-MM-dd") : null,
        bill_proof_url_original: bill_proof_url,
        payment_proof_url_original: payment_proof_url,
        other_attachments,
      };

      // 3. Generate System Bill PDF if requested
      let system_generated_bill_url = account?.system_generated_bill_url || null;
      if (values.generate_bill_proof) {
        const pdfFile = await generateCustomBillPdf(basePdfData, bankAccounts, profile, last4Digits, values.pdf_options);
        system_generated_bill_url = await uploadFile(pdfFile, session.user.id);
      }

      // 4. Generate Full Report PDF
      let relatedInstallments: Account[] = [];
      if (account?.group_id) {
        const { data } = await supabase.from('accounts').select('*').eq('group_id', account.group_id);
        relatedInstallments = data || [];
      }
      const reportPdfFile = await generateFullReportPdf(basePdfData, relatedInstallments);
      const full_report_url = await uploadFile(reportPdfFile, session.user.id);

      // 5. Prepare final data for DB
      const dbData = {
        ...basePdfData,
        bill_proof_url,
        payment_proof_url,
        other_attachments,
        system_generated_bill_url,
        full_report_url,
        // remove form-only fields
        bill_proof: undefined,
        payment_proof: undefined,
        other_attachments_form: undefined,
        generate_bill_proof: undefined,
        pdf_options: undefined,
      };
      
      // 6. Save to DB
      if (account) {
        const { error } = await supabase.from("accounts").update(dbData).eq("id", account.id);
        if (error) throw error;
        showSuccess("Conta atualizada com sucesso!");
      } else {
        // Create logic for single/installment accounts...
        const { error } = await supabase.from("accounts").insert([{ ...dbData, user_id: session.user.id, management_type: managementType }]);
        if (error) throw error;
        showSuccess("Conta criada com sucesso!");
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
            {/* ... existing form fields ... */}
            
            <div className="col-span-1 md:col-span-2 space-y-2">
              <FormLabel>Outros Anexos</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                  <FormField control={form.control} name={`other_attachments_form.${index}.name`} render={({ field }) => (
                    <Input {...field} placeholder="Nome do anexo" className="flex-grow" />
                  )} />
                  <FormField control={form.control} name={`other_attachments_form.${index}.file`} render={({ field }) => (
                     <Input type="file" onChange={(e) => field.onChange(e.target.files)} className="flex-grow" />
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

            <FormField control={form.control} name="generate_bill_proof" render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 pt-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel>Gerar fatura/conta customizada em PDF</FormLabel>
              </FormItem>
            )} />
            {generateBillProof && <PdfOptionsForm />}

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