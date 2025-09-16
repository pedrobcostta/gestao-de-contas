import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Account, BankAccount, CustomAttachment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="text-md">{value}</div>
    </div>
  );
};

const AttachmentItem = ({ label, url }: { label: string; url: string | null | undefined }) => {
  if (!url) return null;
  return (
    <div className="flex items-center justify-between p-2 border rounded-md">
      <span className="text-sm">{label}</span>
      <Button asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Download className="mr-2 h-4 w-4" /> Baixar
        </a>
      </Button>
    </div>
  );
};

export function AccountDetails({ isOpen, setIsOpen, account }: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void; account: Account | null; }) {
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['bank_accounts', account?.management_type],
    queryFn: async () => {
      if (!account?.management_type) return [];
      const { data, error } = await supabase.from('bank_accounts').select('*').eq('management_type', account.management_type);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!account,
  });

  const groupId = account?.subRows ? account.id : account?.group_id;

  const { data: installments = [], isLoading: isLoadingInstallments } = useQuery<Account[]>({
    queryKey: ['installments', groupId],
    queryFn: async () => {
      if (!groupId || account?.account_type !== 'parcelada') return [];
      const { data, error } = await supabase.from('accounts').select('*').eq('group_id', groupId).order('installment_current');
      if (error) throw error;
      return data || [];
    },
    enabled: !!account && account.account_type === 'parcelada' && !!groupId,
  });

  const installmentSummary = useMemo(() => {
    if (!installments || installments.length === 0) return null;
    const paidInstallments = installments.filter(i => i.status === 'pago');
    const paidCount = paidInstallments.length;
    const paidTotal = paidInstallments.reduce((sum, i) => sum + i.total_value, 0);
    const remainingCount = installments.length - paidCount;
    const remainingTotal = installments.filter(i => i.status !== 'pago').reduce((sum, i) => sum + i.total_value, 0);
    return { paidCount, paidTotal, remainingCount, remainingTotal };
  }, [installments]);

  if (!account) return null;

  const paymentBank = bankAccounts.find(b => b.id === account.payment_bank_id);
  const displayAccount = account.subRows ? account.subRows.find(sr => sr.id === account.id) || account : account;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{displayAccount.name}</DialogTitle>
          <DialogDescription>
            Detalhes completos da conta.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className={`grid w-full ${displayAccount.account_type === 'parcelada' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            {displayAccount.account_type === 'parcelada' && (
              <TabsTrigger value="installments">Parcelas</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Valor" value={formatCurrency(displayAccount.total_value)} />
              <DetailItem label="Vencimento" value={format(new Date(`${displayAccount.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })} />
              <DetailItem label="Status" value={<Badge>{displayAccount.status}</Badge>} />
              <DetailItem label="Data de Pagamento" value={displayAccount.payment_date ? format(new Date(`${displayAccount.payment_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }) : null} />
              <DetailItem label="Método de Pagamento" value={displayAccount.payment_method} />
              <DetailItem label="Banco de Pagamento" value={paymentBank ? `${paymentBank.account_name} - ${paymentBank.bank_name}` : null} />
              <DetailItem label="Juros e Multas" value={formatCurrency(displayAccount.fees_and_fines)} />
              {displayAccount.account_type === 'parcelada' && <DetailItem label="Parcela" value={`${displayAccount.installment_current}/${displayAccount.installments_total}`} />}
            </div>
            <DetailItem label="Observações" value={displayAccount.notes} />
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Anexos</h4>
              <AttachmentItem label="Fatura / Conta (Upload)" url={displayAccount.bill_proof_url} />
              <AttachmentItem label="Comprovante de Pagamento" url={displayAccount.payment_proof_url} />
              <AttachmentItem label="Fatura (Gerada pelo Sistema)" url={displayAccount.system_generated_bill_url} />
              <AttachmentItem label="Relatório Completo da Conta" url={displayAccount.full_report_url} />
              {displayAccount.other_attachments?.map((att: CustomAttachment, index: number) => (
                <AttachmentItem key={index} label={att.name} url={att.url} />
              ))}
              {!displayAccount.bill_proof_url && !displayAccount.payment_proof_url && !displayAccount.system_generated_bill_url && !displayAccount.full_report_url && (!displayAccount.other_attachments || displayAccount.other_attachments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo encontrado.</p>
              )}
            </div>
          </TabsContent>

          {displayAccount.account_type === 'parcelada' && (
            <TabsContent value="installments" className="mt-4">
              {isLoadingInstallments ? <Loader2 className="mx-auto animate-spin" /> : (
                <>
                  {installmentSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
                      <DetailItem label="Parcelas Pagas" value={installmentSummary.paidCount} />
                      <DetailItem label="Valor Pago" value={formatCurrency(installmentSummary.paidTotal)} />
                      <DetailItem label="Parcelas Restantes" value={installmentSummary.remainingCount} />
                      <DetailItem label="Valor Restante" value={formatCurrency(installmentSummary.remainingTotal)} />
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installments.map(inst => (
                        <TableRow key={inst.id}>
                          <TableCell>{inst.installment_current}/{inst.installments_total}</TableCell>
                          <TableCell>{format(new Date(`${inst.due_date}T00:00:00`), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{formatCurrency(inst.total_value)}</TableCell>
                          <TableCell><Badge>{inst.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}