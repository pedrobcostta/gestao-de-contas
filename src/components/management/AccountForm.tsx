import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addMonths, addWeeks, addQuarters } from "date-fns";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Account, BankAccount } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { Label } from "../ui/label";

const accountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório."),
  due_date: z.date({ required_error: "Data de vencimento é obrigatória." }),
  total_value: z.coerce.number().positive("O valor deve ser positivo."),
  status: z.enum(["pago", "pendente", "vencido"]),
  purchase_type: z.enum(["unica", "parcelada"]),
  is_recurrent: z.boolean().default(false),
  notes: z.string().optional(),
  payment_method: z.string().optional(),
  installments_total: z.coerce.number().optional(),
  recurrence_frequency: z.string().optional(),
}).refine(data => {
  if (data.purchase_type === 'parcelada') {
    return data.installments_total && data.installments_total > 1 && data.recurrence_frequency;
  }
  return true;
}, {
  message: "Para compras parceladas, informe o número de parcelas e a frequência.",
  path: ["installments_total"],
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
      is_recurrent: false,
      notes: "",
      payment_method: undefined,
      installments_total: 2,
      recurrence_frequency: "monthly",
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

  const [billProofFile, setBillProofFile] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [otherAttachmentsFiles, setOtherAttachmentsFiles] = useState<File[]>([]);
  const [existingOtherAttachments, setExistingOtherAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const purchaseType = form.watch("purchase_type");
  const status = form.watch("status");

  useEffect(() => {
    if (isOpen) {
      if (account) {
        form.reset({
          name: account.name,
          due_date: new Date(`${account.due_date}T00:00:00`),
          total_value: account.total_value,
          status: account.status,
          purchase_type: account.purchase_type,
          is_recurrent: account.is_recurrent,
          notes: account.notes || "",
          payment_method: account.payment_method || undefined,
        });
        setExistingOtherAttachments(account.other_attachments || []);
      } else {
        form.reset({
          name: "",
          due_date: new Date(),
          total_value: 0,
          status: "pendente",
          purchase_type: "unica",
          is_recurrent: false,
          notes: "",
          payment_method: undefined,
          installments_total: 2,
          recurrence_frequency: "monthly",
        });
        setExistingOtherAttachments([]);
      }
      setBillProofFile(null);
      setPaymentProofFile(null);
      setOtherAttachmentsFiles([]);
    }
  }, [account, form, isOpen]);

  const handleRemoveExistingAttachment = (index: number) => {
    setExistingOtherAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Você precisa estar logado.");
      setIsUploading(false);
      return;
    }

    try {
      if (values.purchase_type === 'parcelada' && !account) {
        const groupId = crypto.randomUUID();
        const installmentsToCreate = [];
        const installmentValue = values.total_value / values.installments_total!;
        const startDate = values.due_date;

        for (let i = 0; i < values.installments_total!; i++) {
          let dueDate;
          switch (values.recurrence_frequency) {
            case 'weekly': dueDate = addWeeks(startDate, i); break;
            case 'bimonthly': dueDate = addMonths(startDate, i * 2); break;
            case 'quarterly': dueDate = addQuarters(startDate, i); break;
            default: dueDate = addMonths(startDate, i);
          }

          installmentsToCreate.push({
            user_id: user.id,
            management_type: managementType,
            name: `${values.name} ${i + 1}/${values.installments_total}`,
            due_date: format(dueDate, "yyyy-MM-dd"),
            total_value: installmentValue,
            status: 'pendente',
            purchase_type: 'parcelada',
            is_recurrent: false,
            notes: values.notes,
            payment_method: values.payment_method,
            group_id: groupId,
            installments_total: values.installments_total,
            installment_current: i + 1,
            installment_value: installmentValue,
          });
        }

        const { error } = await supabase.from('accounts').insert(installmentsToCreate);
        if (error) throw error;
        showSuccess(`${values.installments_total} parcelas criadas com sucesso!`);

      } else {
        const uploadFile = async (file: File, userId: string): Promise<string> => {
          const filePath = `${userId}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from('attachments').upload(filePath, file);
          if (error) throw error;
          const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
          return data.publicUrl;
        };

        let bill_proof_url = account?.bill_proof_url || null;
        if (billProofFile) bill_proof_url = await uploadFile(billProofFile, user.id);

        let payment_proof_url = account?.payment_proof_url || null;
        if (paymentProofFile && values.status === 'pago') payment_proof_url = await uploadFile(paymentProofFile, user.id);
        else if (values.status !== 'pago') payment_proof_url = null;

        const newAttachmentUrls = await Promise.all(otherAttachmentsFiles.map(file => uploadFile(file, user.id)));
        const other_attachments = [...existingOtherAttachments, ...newAttachmentUrls];

        const accountData = {
          ...values,
          due_date: format(values.due_date, "yyyy-MM-dd"),
          user_id: user.id,
          management_type: managementType,
          bill_proof_url,
          payment_proof_url,
          other_attachments,
        };

        const { error } = account
          ? await supabase.from("accounts").update(accountData).eq("id", account.id)
          : await supabase.from("accounts").insert(accountData);

        if (error) throw error;
        showSuccess(`Conta ${account ? 'atualizada' : 'criada'} com sucesso!`);

        if (values.is_recurrent && values.status === 'pago' && !account?.is_recurrent) {
          const nextDueDate = addMonths(values.due_date, 1);
          const newRecurrentAccount = { ...accountData, due_date: format(nextDueDate, "yyyy-MM-dd"), status: 'pendente', payment_date: null, payment_proof_url: null };
          delete (newRecurrentAccount as any).id;
          await supabase.from('accounts').insert(newRecurrentAccount);
          showSuccess('Conta do próximo mês criada automaticamente!');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['accounts', managementType] });
      setIsOpen(false);
    } catch (error: any) {
      showError(`Erro: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta" : "Adicionar Nova Conta"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome da Conta</FormLabel> <FormControl> <Input placeholder="Ex: Compra na Loja X" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="total_value" render={({ field }) => ( <FormItem> <FormLabel>Valor Total</FormLabel> <FormControl> <Input type="number" step="0.01" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento {purchaseType === 'parcelada' && '(Primeira Parcela)'}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                      </Button>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={purchaseType === 'parcelada' && !account}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.map(b => <SelectItem key={b.id} value={b.account_name}>{b.account_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Descrição</FormLabel> <FormControl> <Textarea placeholder="Detalhes sobre a conta..." {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
            <FormField
              control={form.control}
              name="purchase_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Compra</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!account}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
            
            {purchaseType === 'parcelada' && !account && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">
                <FormField control={form.control} name="installments_total" render={({ field }) => ( <FormItem> <FormLabel>Nº de Parcelas</FormLabel> <FormControl> <Input type="number" min="2" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                <FormField
                  control={form.control}
                  name="recurrence_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequência</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="bimonthly">Bimestral</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField control={form.control} name="is_recurrent" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"> <div className="space-y-0.5"> <FormLabel>Conta Recorrente</FormLabel> <FormDescription> A conta será recriada para o próximo mês após o pagamento. </FormDescription> </div> <FormControl> <Switch checked={field.value} onCheckedChange={field.onChange} disabled={purchaseType === 'parcelada'} /> </FormControl> </FormItem> )} />
            
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Anexos</h3>
              <div className="space-y-2">
                <Label>Fatura / Conta</Label>
                {account?.bill_proof_url && !billProofFile && ( <div className="text-sm text-blue-500 underline"> <a href={account.bill_proof_url} target="_blank" rel="noopener noreferrer">Ver fatura atual</a> </div> )}
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setBillProofFile(e.target.files?.[0] || null)} />
              </div>

              {status === 'pago' && (
                <div className="space-y-2">
                  <Label>Comprovante de Pagamento</Label>
                  {account?.payment_proof_url && !paymentProofFile && ( <div className="text-sm text-blue-500 underline"> <a href={account.payment_proof_url} target="_blank" rel="noopener noreferrer">Ver comprovante atual</a> </div> )}
                  <Input type="file" accept="image/*,application/pdf" onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Outros Anexos</Label>
                <div className="space-y-2">
                  {existingOtherAttachments.map((url, index) => ( <div key={index} className="flex items-center justify-between text-sm p-2 border rounded-md"> <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate pr-2">Anexo salvo {index + 1}</a> <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveExistingAttachment(index)}> <Trash2 className="h-4 w-4 text-red-500" /> </Button> </div> ))}
                  {otherAttachmentsFiles.map((file, index) => ( <div key={index} className="flex items-center justify-between text-sm p-2 border rounded-md"> <span className="truncate pr-2">{file.name}</span> <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOtherAttachmentsFiles(prev => prev.filter((_, i) => i !== index))}> <Trash2 className="h-4 w-4 text-red-500" /> </Button> </div> ))}
                </div>
                <Input type="file" multiple accept="image/*,application/pdf" className="mt-2" onChange={(e) => { if (e.target.files) { setOtherAttachmentsFiles(prev => [...prev, ...Array.from(e.target.files!)]); } }} />
              </div>
            </div>

            <Button type="submit" disabled={isUploading} className="w-full">
              {isUploading ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}