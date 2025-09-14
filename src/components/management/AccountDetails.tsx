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
import { FileText, Link as LinkIcon } from "lucide-react";

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
  if (!account) return null;

  const allAttachments = [
    ...(account.bill_proof_url ? [{ name: "Fatura / Conta", url: account.bill_proof_url }] : []),
    ...(account.payment_proof_url ? [{ name: "Comprovante de Pagamento", url: account.payment_proof_url }] : []),
    ...(account.other_attachments?.map((url, index) => ({ name: `Outro Anexo ${index + 1}`, url })) || []),
  ];

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Valor Total</p>
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
                    <p className="p-2 bg-muted rounded-md">{account.notes}</p>
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
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          Visualizar <LinkIcon className="h-3 w-3" />
                        </a>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}