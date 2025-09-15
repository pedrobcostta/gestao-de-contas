import { useFormContext, useFieldArray } from "react-hook-form";
import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export const AccountAttachments = () => {
  const { control, watch } = useFormContext();
  const status = watch("status");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "other_attachments_files",
  });

  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="bill_proof"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>Fatura / Conta</FormLabel>
              <FormControl>
                <Input
                  {...fieldProps}
                  type="file"
                  onChange={(e) => onChange(e.target.files?.[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {status === 'pago' && (
          <FormField
            control={control}
            name="payment_proof"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>Comprovante de Pagamento</FormLabel>
                <FormControl>
                  <Input
                    {...fieldProps}
                    type="file"
                    onChange={(e) => onChange(e.target.files?.[0])}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
      <div>
        <FormLabel>Outros Anexos</FormLabel>
        <div className="space-y-3 mt-2">
          {fields.map((item, index) => (
            <div key={item.id} className="flex items-end gap-2 p-2 border rounded-md">
              <FormField
                control={control}
                name={`other_attachments_files.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel className="text-xs">Nome do Anexo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Garantia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`other_attachments_files.${index}.file`}
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem className="flex-grow">
                     <FormLabel className="text-xs">Arquivo</FormLabel>
                    <FormControl>
                       <Input
                        {...fieldProps}
                        type="file"
                        onChange={(e) => onChange(e.target.files?.[0])}
                      />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
         <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ name: "", file: null })}
          >
            Adicionar Anexo
          </Button>
      </div>
    </div>
  );
};