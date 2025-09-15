import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CurrencyInput } from "@/components/CurrencyInput";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export const AccountPrimaryInfo = () => {
  const { control, watch } = useFormContext();
  const accountType = watch("account_type");

  return (
    <div className="space-y-4">
      <FormField control={control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Nome da Conta</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name="total_value" render={({ field }) => (
        <FormItem>
          <FormLabel>{accountType === 'parcelada' ? 'Valor Total da Compra' : 'Valor Total'}</FormLabel>
          <FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name="due_date" render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{accountType === 'parcelada' ? 'Data de Vencimento da 1ª Parcela' : 'Data de Vencimento'}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={control} name="notes" render={({ field }) => (
        <FormItem>
          <FormLabel>Observações</FormLabel>
          <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
};