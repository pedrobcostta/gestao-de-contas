import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BankAccount } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="text-md break-words">{value}</div>
    </div>
  );
};

const accountTypeLabels: { [key: string]: string } = {
  conta_corrente: "Conta Corrente",
  poupanca: "Poupança",
  cartao_credito: "Cartão de Crédito",
};

export function BankAccountDetails({ isOpen, setIsOpen, bankAccount }: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void; bankAccount: BankAccount | null; }) {
  if (!bankAccount) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bankAccount.account_name}</DialogTitle>
          <DialogDescription>{bankAccount.bank_name}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <DetailItem label="Tipo" value={<Badge variant="secondary">{accountTypeLabels[bankAccount.account_type]}</Badge>} />
          <DetailItem label="Titular" value={bankAccount.owner_name} />
          <DetailItem label="CPF do Titular" value={bankAccount.owner_cpf} />
          
          {bankAccount.account_type === 'cartao_credito' ? (
            <>
              <DetailItem label="Final do Cartão" value={bankAccount.card_last_4_digits} />
              <DetailItem label="Limite" value={formatCurrency(bankAccount.card_limit)} />
              <DetailItem label="Dia de Fechamento" value={bankAccount.card_closing_day} />
              <DetailItem label="Dia de Vencimento" value={bankAccount.card_due_day} />
            </>
          ) : (
            <>
              <DetailItem label="Agência" value={bankAccount.agency} />
              <DetailItem label="Conta" value={bankAccount.account_number} />
            </>
          )}

          <div className="col-span-2 border-t pt-4 mt-2">
            <DetailItem label="Identificador de Login" value={bankAccount.login_identifier} />
          </div>
          <DetailItem label="Senha de Acesso" value={bankAccount.access_password ? '••••••••' : null} />
          <DetailItem label="Senha de Transação" value={bankAccount.transaction_password ? '••••••••' : null} />
        </div>
      </DialogContent>
    </Dialog>
  );
}