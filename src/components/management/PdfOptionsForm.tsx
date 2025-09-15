import { useFormContext } from "react-hook-form";
import { FormField, FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mainOptions = [
  { id: "include_name", label: "Nome da Conta" },
  { id: "include_total_value", label: "Valor" },
  { id: "include_due_date", label: "Data de Vencimento" },
  { id: "include_status", label: "Status" },
  { id: "include_account_type", label: "Tipo de Conta" },
  { id: "include_installments", label: "Parcelas" },
  { id: "include_payment_date", label: "Data de Pagamento" },
  { id: "include_payment_method", label: "Método de Pagamento" },
  { id: "include_fees_and_fines", label: "Juros e Multas" },
  { id: "include_notes", label: "Observações" },
];

const advancedOptions = [
  { id: "include_payment_bank_details", label: "Incluir Dados Bancários" },
  { id: "include_attachments", label: "Adicionar Anexos ao PDF" },
  { id: "include_signatures", label: "Incluir Linhas de Assinatura" },
];

const profileFields = [
    { id: "full_name", label: "Nome Completo" },
    { id: "cpf", label: "CPF" },
    { id: "rg", label: "RG" },
];

export const PdfOptionsForm = () => {
  const { control } = useFormContext();

  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-md">Informações para incluir no PDF</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {mainOptions.map(option => (
            <FormField key={option.id} control={control} name={`pdf_options.${option.id}`} render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="font-normal text-sm">{option.label}</FormLabel>
              </FormItem>
            )} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-md">Opções Avançadas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {advancedOptions.map(option => (
            <FormField key={option.id} control={control} name={`pdf_options.${option.id}`} render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="font-normal text-sm">{option.label}</FormLabel>
              </FormItem>
            )} />
          ))}
        </CardContent>
      </Card>
       <Card>
        <CardHeader><CardTitle className="text-md">Incluir Dados do Perfil</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {profileFields.map(option => (
            <FormField key={option.id} control={control} name={`pdf_options.include_profile_fields.${option.id}`} render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="font-normal text-sm">{option.label}</FormLabel>
              </FormItem>
            )} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};