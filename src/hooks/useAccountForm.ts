import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Account, BankAccount, Profile, CustomAttachment } from "@/types";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format } from "date-fns";
import { generateCustomBillPdf, generateFullReportPdf } from "@/utils/pdfGenerator";

const formSchema = z.object({
  name: z.string().min(1, "O nome da conta é obrigatório."),
  total_value: z.number().min(0.01, "O valor deve ser maior que zero."),
  due_date: z.date({ required_error: "A data de vencimento é obrigatória." }),
  account_type: z.enum(["unica", "parcelada", "recorrente"]),
  
  // Installment fields
  value_type: z.enum(["total", "installment"]).default("total"),
  installments_total: z.coerce.number().optional(),
  installment_current: z.coerce.number().optional(),
  create_previous_installments: z.boolean().default(false),
  previous_installments_status: z.enum(["pendente", "pago", "vencido"]).default("pago"),

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
  other_attachments_files: z.array(z.object({
    name: z.string().min(1, "O nome do anexo é obrigatório."),
    file: z.instanceof(File, { message: "O arquivo é obrigatório." }).nullable(),
  })).optional(),
  generate_system_bill: z.boolean().default(false),
  pdf_options: z.object({
    include_name: z.boolean().default(false),
    include_total_value: z.boolean().default(false),
    include_due_date: z.boolean().default(false),
    include_status: z.boolean().default(false),
    include_account_type: z.boolean().default(false),
    include_installments: z.boolean().default(false),
    include_payment_date: z.boolean().default(false),
    include_payment_method: z.boolean().default(false),
    include_payment_bank_details: z.boolean().default(false),
    include_fees_and_fines: z.boolean().default(false),
    include_notes: z.boolean().default(false),
    include_attachments: z.boolean().default(false),
    include_signatures: z.boolean().default(false),
    include_profile_fields: z.object({
        full_name: z.boolean().default(false),
        cpf: z.boolean().default(false),
        rg: z.boolean().default(false),
    }).default({}),
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

type UseAccountFormProps = {
  account?: Account | null;
  managementType: Account["management_type"];
  setIsOpen: (isOpen: boolean) => void;
};

export const useAccountForm = ({ account, managementType, setIsOpen }: UseAccountFormProps) => {
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
    queryKey: ['profile', session?.user?.id, managementType],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).eq('management_type', managementType).single();
      if (error && error.code !== 'PGRST116') { console.error(error); return null; }
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_type: 'unica',
      status: 'pendente',
      value_type: 'total',
      installment_current: 1,
      create_previous_installments: false,
      previous_installments_status: 'pago',
      generate_system_bill: false,
      pdf_options: {
        include_name: false, include_total_value: false, include_due_date: false, include_status: false,
        include_account_type: false, include_installments: false, include_payment_date: false,
        include_payment_method: false, include_payment_bank_details: false, include_fees_and_fines: false,
        include_notes: false, include_attachments: false, include_signatures: false,
        include_profile_fields: { full_name: false, cpf: false, rg: false },
      },
    },
  });

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
        value_type: 'total',
      });
    } else {
      form.reset();
    }
  }, [account, form]);

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    if (!session?.user || !file) throw new Error("Usuário ou arquivo inválido para upload.");
    const filePath = `${session.user.id}/${managementType}/${uuidv4()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) throw new Error(`Erro no upload do arquivo: ${error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user) return showError("Usuário não autenticado.");
    setIsSubmitting(true);
    const toastId = showLoading("Salvando conta...");

    try {
      if (account) {
        const idToDelete = account.group_id || account.id;
        const columnToDelete = account.group_id ? 'group_id' : 'id';
        const { error: deleteError } = await supabase.from('accounts').delete().eq(columnToDelete, idToDelete);
        if (deleteError) throw deleteError;
      }

      const { bill_proof, payment_proof, other_attachments_files, generate_system_bill, pdf_options, value_type, create_previous_installments, previous_installments_status, ...dbData } = values;
      const paymentBank = bankAccounts.find(b => b.id === values.payment_bank_id);

      let billProofUrl = account?.bill_proof_url || null;
      if (bill_proof) billProofUrl = await uploadFile(bill_proof, 'attachments');

      let paymentProofUrl = account?.payment_proof_url || null;
      if (payment_proof) paymentProofUrl = await uploadFile(payment_proof, 'attachments');

      const otherAttachments: CustomAttachment[] = account?.other_attachments || [];
      if (other_attachments_files) {
        for (const attachment of other_attachments_files) {
          if (attachment.file) {
            const url = await uploadFile(attachment.file, 'attachments');
            otherAttachments.push({ name: attachment.name, url });
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

      let systemGeneratedBillUrl = account?.system_generated_bill_url || null;
      if (generate_system_bill) {
        const pdfData = { ...baseAccountData, due_date: values.due_date, payment_date: values.payment_date };
        const file = await generateCustomBillPdf(pdfData, paymentBank || null, profile, pdf_options, otherAttachments);
        systemGeneratedBillUrl = await uploadFile(file, 'generated-bills');
      } else if (account?.system_generated_bill_url) {
        systemGeneratedBillUrl = null;
      }
      
      const finalBaseAccountData = { ...baseAccountData, system_generated_bill_url: systemGeneratedBillUrl };

      const groupId = uuidv4();
      if (values.account_type === 'parcelada' && values.installments_total) {
        const newAccounts = [];
        const currentInstallment = values.installment_current || 1;
        const formDueDate = values.due_date;
        
        let totalValue = values.total_value;
        let installmentValue = 0;
        if (values.value_type === 'installment') {
            totalValue = values.total_value * values.installments_total;
            installmentValue = values.total_value;
        } else {
            installmentValue = values.total_value / values.installments_total;
        }

        for (let i = 1; i <= values.installments_total; i++) {
          let status: Account['status'] = 'pendente';
          if (i < currentInstallment && values.create_previous_installments) {
            status = values.previous_installments_status;
          }

          if (i < currentInstallment && !values.create_previous_installments) {
            continue;
          }

          newAccounts.push({ ...finalBaseAccountData, name: `${values.name}`, due_date: format(addMonths(formDueDate, i - currentInstallment), "yyyy-MM-dd"), total_value: installmentValue, installment_current: i, installments_total: values.installments_total, installment_value: installmentValue, group_id: groupId, status });
        }
        
        const reportFile = await generateFullReportPdf({ ...finalBaseAccountData, total_value: totalValue }, newAccounts, paymentBank || null);
        const reportUrl = await uploadFile(reportFile, 'generated-reports');
        newAccounts.forEach(acc => acc.full_report_url = reportUrl);
        const { error } = await supabase.from("accounts").insert(newAccounts);
        if (error) throw error;

      } else if (values.account_type === 'recorrente' && values.recurrence_end_date) {
        const newAccounts = [];
        let currentDate = values.due_date;
        while (currentDate <= values.recurrence_end_date) {
          newAccounts.push({ ...finalBaseAccountData, due_date: format(currentDate, "yyyy-MM-dd"), group_id: groupId });
          currentDate = addMonths(currentDate, 1);
        }
        const { error } = await supabase.from("accounts").insert(newAccounts);
        if (error) throw error;
      } else {
        const reportFile = await generateFullReportPdf(finalBaseAccountData, [], paymentBank || null);
        const reportUrl = await uploadFile(reportFile, 'generated-reports');
        const dataToInsert = { ...finalBaseAccountData, group_id: groupId, full_report_url: reportUrl };
        const { error } = await supabase.from("accounts").insert([dataToInsert]);
        if (error) throw error;
      }
      
      showSuccess(account ? "Conta atualizada com sucesso!" : "Conta(s) criada(s) com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsOpen(false);
    } catch (error: any) {
      showError(`Erro ao salvar conta: ${error.message}`);
    } finally {
      dismissToast(toastId);
      setIsSubmitting(false);
    }
  };

  return { form, onSubmit, isSubmitting, bankAccounts };
};