import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QRCode from "qrcode.react";

interface QRCodeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  value: string;
}

export function QRCodeModal({ isOpen, setIsOpen, value }: QRCodeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>QR Code PIX</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center p-4 bg-white rounded-md">
          {value && <QRCode value={value} size={256} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}