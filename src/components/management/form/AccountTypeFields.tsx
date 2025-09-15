import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Account } from "@/types";

interface AccountTypeFieldsProps {
  account?: Account | null;
}

export const AccountTypeFields = ({ account }: AccountTypeFieldsProps) => {
  const { control, watch } = useFormContext();
  const accountType = watch("account_type");

  return (
    <>
      <FormField control={control} name="account_type" render={({ field }) => (
        <FormItem>
          <FormLabel>Tipo de Conta</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!account}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="unica">Única</SelectItem>
              <SelectItem value="parcelada">Parcelada</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      {accountType === 'parcelada' && (
        <FormField control={control} name="installments_total" render={({ field }) => (
          <FormItem>
            <FormLabel>Número de Parcelas</FormLabel>
            <FormControl><Input type="number" {...field} disabled={!!account} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}
      {accountType === 'recorrente' && (
        <FormField control={control} name="recurrence_end_date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data Final da Recorrência</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!!account}>
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
      )}
    </>
  );
};