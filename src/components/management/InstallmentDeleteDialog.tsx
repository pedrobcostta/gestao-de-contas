import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface InstallmentDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeleteSingle: () => void;
  onDeleteAll: () => void;
  accountName: string;
}

export function InstallmentDeleteDialog({
  isOpen,
  onOpenChange,
  onDeleteSingle,
  onDeleteAll,
  accountName,
}: InstallmentDeleteDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Conta Parcelada</AlertDialogTitle>
          <AlertDialogDescription>
            Esta é uma parcela da compra "{accountName}". Você deseja deletar apenas esta parcela ou todas as parcelas relacionadas a esta compra?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="outline" onClick={onDeleteSingle}>Apenas esta parcela</Button>
          <Button variant="destructive" onClick={onDeleteAll}>Deletar Todas</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}