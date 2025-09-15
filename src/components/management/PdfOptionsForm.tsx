import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

const options = [
  { id: "include_name", label: "Nome da Conta" },
  { id: "include_total_value", label: "Valor" },
  { id: "include_due_date", label: "Data de Vencimento" },
  { id: "include_status", label: "Status" },
  { id: "include_account_type", label: "Tipo de Conta" },
  { id: "include_installments", label: "Parcelas" },
  { id: "include_payment_date", label: "Data de Pagamento" },
  { id: "include_payment_method", label: "Método de Pagamento" },
  { id: "include_payment_bank", label: "Banco de Pagamento" },
  { id: "include_fees_and_fines", label: "Juros e Multas" },
  { id: "include_notes", label: "Observações" },
  { id: "include_bill_proof", label: "Anexo - Fatura/Conta (QR Code)" },
  { id: "include_payment_proof", label: "Anexo - Comprovante (QR Code)" },
  { id: "include_owner_signature", label: "Assinatura do Proprietário" },
  { id: "include_recipient_signature", label: "Assinatura do Destinatário" },
];

export const PdfOptionsForm = () => {
  const { control } = useFormContext();

  return (
    <div className="col-span-1 md:col-span-2 space-y-4 border p-4 rounded-md">
      <h3 className="text-md font-semibold">Informações para incluir no PDF</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {options.map(option => (
          <FormField
            key={option.id}
            control={control}
            name={`pdf_options.${option.id}`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal text-sm">
                  {option.label}
                </FormLabel>
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
};