import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { FormField, FormControl, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Account } from "@/types";

interface AccountTypeFieldsProps {
  account?: Account | null;
}

export const AccountTypeFields = ({ account }: AccountTypeFieldsProps) => {
  const { control, watch } = useFormContext();
  const accountType = watch("account_type");
  const createPreviousInstallments = watch("create_previous_installments");

  return (
    <div className="space-y-4">
      <FormField control={control} name="account_type" render={({ field }) => (
        <FormItem>
          <FormLabel>Tipo de Conta</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <div className="space-y-4 p-4 border rounded-md">
          <FormField control={control} name="value_type" render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>O valor informado é referente a:</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl><RadioGroupItem value="total" /></FormControl>
                    <FormLabel className="font-normal">Valor Total da Compra</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl><RadioGroupItem value="installment" /></FormControl>
                    <FormLabel className="font-normal">Valor de Cada Parcela</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                O sistema calculará o valor da parcela ou o total automaticamente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="installments_total" render={({ field }) => (
            <FormItem>
              <FormLabel>Número Total de Parcelas</FormLabel>
              <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="installment_current" render={({ field }) => (
            <FormItem>
              <FormLabel>Parcela Atual</FormLabel>
              <FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="1" /></FormControl>
              <FormDescription>
                Para uma nova compra, use 1. Para uma compra em andamento, informe o número da parcela atual.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="create_previous_installments" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Criar parcelas anteriores?</FormLabel>
                <FormDescription>
                  Marque esta opção para registrar as parcelas anteriores à atual.
                </FormDescription>
              </div>
            </FormItem>
          )} />
          {createPreviousInstallments && (
            <FormField control={control} name="previous_installments_status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status das Parcelas Anteriores</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      )}
      {accountType === 'recorrente' && (
        <FormField control={control} name="recurrence_end_date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data Final da Recorrência</FormLabel>
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
      )}
    </div>
  );
};