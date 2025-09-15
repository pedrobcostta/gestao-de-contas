import { FormProvider } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Account } from "@/types";
import { useAccountForm } from "@/hooks/useAccountForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { AccountPrimaryInfo } from "./form/AccountPrimaryInfo";
import { AccountTypeFields } from "./form/AccountTypeFields";
import { AccountPaymentInfo } from "./form/AccountPaymentInfo";
import { AccountAttachments } from "./form/AccountAttachments";
import { AccountPdfOptions } from "./form/AccountPdfOptions";

interface AccountFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account?: Account | null;
  managementType: Account["management_type"];
}

export function AccountForm({ isOpen, setIsOpen, account, managementType }: AccountFormProps) {
  const { form, onSubmit, isSubmitting, bankAccounts } = useAccountForm({ account, managementType, setIsOpen });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta" : "Adicionar Nova Conta"}</DialogTitle>
          <DialogDescription>Preencha os detalhes da conta abaixo.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <AccountPrimaryInfo />
                <AccountTypeFields account={account} />
              </div>
              <div className="space-y-4">
                <AccountPaymentInfo bankAccounts={bankAccounts} />
              </div>
              <AccountAttachments />
              <AccountPdfOptions />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}