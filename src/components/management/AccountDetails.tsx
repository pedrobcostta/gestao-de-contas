import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Account } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Link as LinkIcon, List } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

const purchaseTypeLabels: { [key: string]: string } = {
  unica: "Única",
  parcelada: "Parcelada",
};

export function AccountDetails({ isOpen, setIsOpen, account }: AccountDetailsProps) {
  const { data: installments = [], isLoading } = useQuery({
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

  const allAttachments = [
    ...(account.bill_proof_url ? [{ name: "Fatura / Conta", url: account.bill_proof_url }] : []),
    ...(account.payment_proof_url ? [{ name: "Comprovante de Pagamento", url: account.payment_proof_url }] : []),
    ...(account.other_attachments?.map((url, index) => ({ name: `Outro Anexo ${index + 1}`, url })) || []),
  ];

  const TABS = ["details", "attachments"];
  if (account.group_id) TABS.push("installments");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account.name}</DialogTitle>
          <DialogDescription>
            Detalhes completos da conta.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className={`grid w-full grid-cols-${TABS.length}`}>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            {account.group_id && <TabsTrigger value="installments">Parcelas</TabsTrigger>}
          </TabsList>
          <TabsContent value="details">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Valor {account.purchase_type === 'parcelada' ? 'da Parcela' : 'Total'}</p>
                    <p className="font-semibold text-lg">{formatCurrency(account.total_value)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Status</p>
                    <Badge variant={statusVariant[account.status] || "secondary"}>
                      {account.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Data de Vencimento</p>
                    <p>{format(new Date(`${account.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  {account.payment_date && (
                    <div>
                      <p className="font-medium text-muted-foreground">Data de Pagamento</p>
                      <p>{format(new Date(`${account.payment_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-muted-foreground">Tipo de Compra</p>
                    <p>{purchaseTypeLabels[account.purchase_type]}</p>
                  </div>
                  {account.payment_method && (
                     <div>
                      <p className="font-medium text-muted-foreground">Método de Pagamento</p>
                      <p>{account.payment_method}</p>
                    </div>
                  )}
                </div>
                {account.notes && (
                  <div className="text-sm">
                    <p className="font-medium text-muted-foreground">Observações</p>
                    <p className="p-2 bg-muted rounded-md whitespace-pre-wrap">{account.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="attachments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span>Documentos Anexados</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allAttachments.length > 0 ? (
                  <ul className="space-y-2">
                    {allAttachments.map((attachment, index) => (
                      <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                        <span className="text-sm font-medium">{attachment.name}</span>
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline" > Visualizar <LinkIcon className="h-3 w-3" /> </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum anexo encontrado para esta conta.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {account.group_id && (
            <TabsContent value="installments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    <span>Histórico de Parcelas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? <p>Carregando parcelas...</p> : (
                    <ul className="space-y-2">
                      {installments.map(inst => (
                        <li key={inst.id} className={`flex items-center justify-between p-2 border rounded-md ${inst.id === account.id ? 'bg-muted' : ''}`}>
                          <div className="flex flex-col">
                            <span className="font-medium">{inst.name}</span>
                            <span className="text-xs text-muted-foreground">Vencimento: {format(new Date(`${inst.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                          <div className="text-right">
                            <Badge variant={statusVariant[inst.status] || "secondary"}>{inst.status}</Badge>
                            <p className="font-semibold">{formatCurrency(inst.total_value)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}