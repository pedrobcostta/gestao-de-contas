import { useFormContext } from "react-hook-form";
import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const AccountAttachments = () => {
  const { control, watch } = useFormContext();
  const status = watch("status");

  return (
    <div className="col-span-1 md:col-span-2 space-y-4 border p-4 rounded-md">
      <h3 className="text-md font-semibold">Anexos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField control={control} name="bill_proof" render={({ field: { onChange, ...props } }) => (
          <FormItem>
            <FormLabel>Fatura / Conta</FormLabel>
            <FormControl>
              <Input type="file" {...props} onChange={(e) => onChange(e.target.files?.[0])} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {status === 'pago' && (
          <FormField control={control} name="payment_proof" render={({ field: { onChange, ...props } }) => (
            <FormItem>
              <FormLabel>Comprovante de Pagamento</FormLabel>
              <FormControl>
                <Input type="file" {...props} onChange={(e) => onChange(e.target.files?.[0])} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>
    </div>
  );
};