import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

// ... (interfaces and helper components)

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

export function AccountDetails({ isOpen, setIsOpen, account }: any) {
  // ... (query for installments)

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        {/* ... (DialogHeader and main details) */}
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            <TabsTrigger value="installments">Parcelas</TabsTrigger>
          </TabsList>
          
          {/* ... (Details and Installments TabsContent) */}

          <TabsContent value="attachments" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Anexos</h4>
              <AttachmentItem label="Fatura / Conta (Upload)" url={account.bill_proof_url} />
              <AttachmentItem label="Comprovante de Pagamento" url={account.payment_proof_url} />
              <AttachmentItem label="Fatura (Gerada pelo Sistema)" url={account.system_generated_bill_url} />
              <AttachmentItem label="Relatório Completo da Conta" url={account.full_report_url} />
              {account.other_attachments?.map((att: any, index: number) => (
                <AttachmentItem key={index} label={att.name} url={att.url} />
              ))}
              {/* ... no attachments message */}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}