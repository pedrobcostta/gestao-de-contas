import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Account } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface AccountDetailsProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account: Account | null;
}

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  pago: "default",
  pendente: "secondary",
  vencido: "destructive",
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="font-medium">{value || "-"}</span>
  </div>
);

export function AccountDetails({ isOpen, setIsOpen, account }: AccountDetailsProps) {
  const { data: installments = [], isLoading: isLoadingInstallments } = useQuery({
    queryKey: ['installments', account?.group_id],
    queryFn: async (): Promise<Account[]> => {
      if (!account?.group_id) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('group_id', account.group_id)
        .order('installment_current', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!account?.group_id,
  });

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Conta</DialogTitle>
          <DialogDescription>{account.name}</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className={`grid w-full ${account.group_id ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            {account.group_id && <TabsTrigger value="installments">Parcelas</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Valor" value={formatCurrency(account.total_value)} />
              <DetailItem label="Vencimento" value={format(new Date(`${account.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })} />
              <DetailItem label="Status" value={<Badge variant={statusVariant[account.status] || "secondary"}>{account.status}</Badge>} />
              <DetailItem label="Tipo" value={account.account_type} />
              {account.payment_date && <DetailItem label="Data Pagamento" value={format(new Date(`${account.payment_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })} />}
              {account.payment_method && <DetailItem label="Método Pagamento" value={account.payment_method} />}
              {account.fees_and_fines && <DetailItem label="Juros e Multas" value={formatCurrency(account.fees_and_fines)} />}
            </div>
            {account.notes && (
              <div>
                <h4 className="font-medium mb-1">Observações</h4>
                <p className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-md">{account.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <div className="space-y-4">
              <h4 className="font-medium">Anexos</h4>
              {!account.bill_proof_url && !account.payment_proof_url && (
                <p className="text-sm text-muted-foreground">Nenhum anexo encontrado.</p>
              )}
              {account.bill_proof_url && (
                <div className="flex items-center justify-between p-2 border rounded-md">
                  <span className="text-sm">Fatura / Conta</span>
                  <Button asChild variant="outline" size="sm">
                    <a href={account.bill_proof_url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </a>
                  </Button>
                </div>
              )}
              {account.payment_proof_url && (
                <div className="flex items-center justify-between p-2 border rounded-md">
                  <span className="text-sm">Comprovante de Pagamento</span>
                  <Button asChild variant="outline" size="sm">
                    <a href={account.payment_proof_url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {account.group_id && (
            <TabsContent value="installments" className="mt-4">
              <h4 className="font-medium mb-2">Parcelas</h4>
              {isLoadingInstallments ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {installments.map(inst => (
                    <div key={inst.id} className={`flex justify-between items-center p-2 rounded-md border ${inst.id === account.id ? 'bg-muted' : ''}`}>
                      <div>
                        <p className="text-sm font-medium">{inst.name}</p>
                        <p className="text-xs text-muted-foreground">Vencimento: {format(new Date(`${inst.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(inst.total_value)}</p>
                        <Badge variant={statusVariant[inst.status] || "secondary"} className="text-xs">{inst.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}