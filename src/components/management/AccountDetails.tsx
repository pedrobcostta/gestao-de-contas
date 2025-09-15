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

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-md">{value}</p>
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

  const { data: installments = [], isLoading: isLoadingInstallments } = useQuery<Account[]>({
    queryKey: ['installments', account?.group_id],
    queryFn: async () => {
      if (!account?.group_id || account.account_type !== 'parcelada') return [];
      const { data, error } = await supabase.from('accounts').select('*').eq('group_id', account.group_id).order('installment_current');
      if (error) throw error;
      return data || [];
    },
    enabled: !!account && account.account_type === 'parcelada' && !!account.group_id,
  });

  if (!account) return null;

  const paymentBank = bankAccounts.find(b => b.id === account.payment_bank_id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account.name}</DialogTitle>
          <DialogDescription>
            Detalhes completos da conta.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className={`grid w-full ${account.account_type === 'parcelada' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            {account.account_type === 'parcelada' && (
              <TabsTrigger value="installments">Parcelas</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Valor" value={formatCurrency(account.total_value)} />
              <DetailItem label="Vencimento" value={format(new Date(`${account.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })} />
              <DetailItem label="Status" value={<Badge>{account.status}</Badge>} />
              <DetailItem label="Data de Pagamento" value={account.payment_date ? format(new Date(`${account.payment_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }) : null} />
              <DetailItem label="Método de Pagamento" value={account.payment_method} />
              <DetailItem label="Banco de Pagamento" value={paymentBank ? `${paymentBank.account_name} - ${paymentBank.bank_name}` : null} />
              <DetailItem label="Juros e Multas" value={formatCurrency(account.fees_and_fines)} />
              {account.account_type === 'parcelada' && <DetailItem label="Parcela" value={`${account.installment_current}/${account.installments_total}`} />}
            </div>
            <DetailItem label="Observações" value={account.notes} />
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Anexos</h4>
              <AttachmentItem label="Fatura / Conta (Upload)" url={account.bill_proof_url} />
              <AttachmentItem label="Comprovante de Pagamento" url={account.payment_proof_url} />
              <AttachmentItem label="Fatura (Gerada pelo Sistema)" url={account.system_generated_bill_url} />
              <AttachmentItem label="Relatório Completo da Conta" url={account.full_report_url} />
              {account.other_attachments?.map((att: CustomAttachment, index: number) => (
                <AttachmentItem key={index} label={att.name} url={att.url} />
              ))}
              {!account.bill_proof_url && !account.payment_proof_url && !account.system_generated_bill_url && !account.full_report_url && (!account.other_attachments || account.other_attachments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo encontrado.</p>
              )}
            </div>
          </TabsContent>

          {account.account_type === 'parcelada' && (
            <TabsContent value="installments" className="mt-4">
              {isLoadingInstallments ? <Loader2 className="mx-auto animate-spin" /> : (
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
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}