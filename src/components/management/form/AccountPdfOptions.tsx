import { useFormContext } from "react-hook-form";
import { FormField, FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { PdfOptionsForm } from "../PdfOptionsForm";

export const AccountPdfOptions = () => {
  const { control, watch } = useFormContext();
  const generateSystemBill = watch("generate_system_bill");

  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      <FormField
        control={control}
        name="generate_system_bill"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                Gerar Fatura/Conta em PDF
              </FormLabel>
            </div>
          </FormItem>
        )}
      />
      {generateSystemBill && <PdfOptionsForm />}
    </div>
  );
};