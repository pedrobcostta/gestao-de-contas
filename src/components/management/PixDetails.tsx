import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PixKey } from "@/types";
import { Badge } from "@/components/ui/badge";

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="text-md break-words">{value}</div>
    </div>
  );
};

const keyTypeLabels: { [key: string]: string } = {
  cpf_cnpj: "CPF/CNPJ",
  celular: "Celular",
  email: "E-mail",
  aleatoria: "Aleatória",
  br_code: "Copia e Cola",
};

export function PixDetails({ isOpen, setIsOpen, pixKey }: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void; pixKey: PixKey | null; }) {
  if (!pixKey) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Chave PIX</DialogTitle>
          <DialogDescription>{pixKey.owner_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <DetailItem label="Titular" value={pixKey.owner_name} />
          <DetailItem label="Banco" value={pixKey.bank_name} />
          <DetailItem label="Tipo" value={<Badge variant="outline">{keyTypeLabels[pixKey.key_type]}</Badge>} />
          <DetailItem label="Chave" value={pixKey.key_value} />
        </div>
      </DialogContent>
    </Dialog>
  );
}