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
import { CurrencyInput } from "@/components/CurrencyInput";
import { cn } from "@/lib/utils";
import { BankAccount } from "@/types";

interface AccountPaymentInfoProps {
  bankAccounts: BankAccount[];
}

export const AccountPaymentInfo = ({ bankAccounts }: AccountPaymentInfoProps) => {
  const { control, watch } = useFormContext();
  const status = watch("status");
  const paymentMethod = watch("payment_method");
  const paymentBankId = watch("payment_bank_id");
  const selectedPaymentBank = bankAccounts.find(b => b.id === paymentBankId);

  return (
    <div className="space-y-4">
      <FormField control={control} name="status" render={({ field }) => (
        <FormItem>
          <FormLabel>Status</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      {status === 'pago' && (
        <>
          <FormField control={control} name="payment_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Pagamento</FormLabel>
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
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="payment_method" render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Pagamento</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          {paymentMethod !== 'dinheiro' && (
            <FormField control={control} name="payment_bank_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Conta/Cartão de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.account_name} - {b.bank_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}
          {selectedPaymentBank?.account_type === 'cartao_credito' && (
            <FormField control={control} name="card_last_4_digits" render={({ field }) => (
              <FormItem>
                <FormLabel>Últimos 4 dígitos do cartão</FormLabel>
                <FormControl><Input {...field} maxLength={4} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </>
      )}
      {status === 'vencido' && (
        <FormField control={control} name="fees_and_fines" render={({ field }) => (
          <FormItem>
            <FormLabel>Juros e Multas</FormLabel>
            <FormControl><CurrencyInput value={field.value || 0} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}
    </div>
  );
};