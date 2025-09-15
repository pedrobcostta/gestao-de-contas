import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Account, BankAccount, Profile } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PdfOptions {
  include_name?: boolean;
  include_total_value?: boolean;
  include_due_date?: boolean;
  include_status?: boolean;
  include_account_type?: boolean;
  include_installments?: boolean;
  include_payment_date?: boolean;
  include_payment_method?: boolean;
  include_payment_bank?: boolean;
  include_fees_and_fines?: boolean;
  include_notes?: boolean;
  include_bill_proof?: boolean;
  include_payment_proof?: boolean;
  include_owner_signature?: boolean;
  include_recipient_signature?: boolean;
}

// Helper to add a row to the PDF body if the option is enabled and value exists
const addRow = (body: any[][], option: boolean | undefined, label: string, value: any) => {
  if (option && value) {
    body.push([label, value]);
  }
};

export const generateAccountPdf = async (
  accountData: Partial<Account> & { bill_proof_url_original?: string, payment_proof_url_original?: string },
  bankAccounts: BankAccount[],
  profile: Profile | null,
  last4Digits: string,
  options: PdfOptions
): Promise<File> => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Comprovante de Conta", 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);

  const body: any[][] = [];

  addRow(body, options.include_name, "Nome da Conta:", accountData.name);
  addRow(body, options.include_total_value, "Valor:", formatCurrency(accountData.total_value));
  addRow(body, options.include_due_date, "Data de Vencimento:", accountData.due_date ? format(new Date(`${accountData.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }) : '-');
  addRow(body, options.include_status, "Status:", accountData.status);
  addRow(body, options.include_account_type, "Tipo de Conta:", accountData.account_type);
  
  if (options.include_installments && accountData.account_type === 'parcelada') {
    addRow(body, true, "Parcela:", `${accountData.installment_current}/${accountData.installments_total}`);
  }

  if (accountData.status === 'pago') {
    addRow(body, options.include_payment_date, "Data de Pagamento:", accountData.payment_date ? format(new Date(`${accountData.payment_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }) : '-');
    addRow(body, options.include_payment_method, "Método de Pagamento:", accountData.payment_method);
    
    if (options.include_payment_bank && accountData.payment_bank_id) {
        const bank = bankAccounts.find(b => b.id === accountData.payment_bank_id);
        if (bank) {
            if (bank.account_type === 'cartao_credito') {
                addRow(body, true, "Instituição:", `${bank.account_name} - ${bank.bank_name}`);
                if (last4Digits) {
                    addRow(body, true, "Final do Cartão:", `**** **** **** ${last4Digits}`);
                }
            } else { // conta_corrente or poupanca
                addRow(body, true, "Banco de Pagamento:", `${bank.account_name} - ${bank.bank_name}`);
                addRow(body, true, "Agência:", bank.agency);
                addRow(body, true, "Conta:", bank.account_number);
                if (profile) {
                    addRow(body, true, "Titular:", `${profile.first_name || ''} ${profile.last_name || ''}`.trim());
                }
            }
        }
    }
  }

  addRow(body, options.include_fees_and_fines, "Juros e Multas:", formatCurrency(accountData.fees_and_fines));
  addRow(body, options.include_notes, "Observações:", accountData.notes);

  autoTable(doc, {
    startY: 30,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY || 30;

  // Handle attachments
  const addAttachmentSection = async (label: string, url: string | undefined) => {
    if (!url) return;
    
    finalY += 10;
    if (finalY > 260) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.text(label, 14, finalY);
    finalY += 5;

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, { width: 60 });
      doc.addImage(qrCodeDataUrl, 'PNG', 14, finalY, 40, 40);
      
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 255);
      doc.textWithLink("Link para o anexo", 60, finalY + 20, { url });

    } catch (err) {
      console.error(err);
      doc.setFontSize(9);
      doc.setTextColor(255, 0, 0);
      doc.text("Não foi possível gerar o QR Code.", 14, finalY + 10);
    }
    finalY += 50;
  };

  if (options.include_bill_proof) {
    await addAttachmentSection("Anexo - Fatura/Conta", accountData.bill_proof_url_original);
  }
  if (options.include_payment_proof) {
    await addAttachmentSection("Anexo - Comprovante de Pagamento", accountData.payment_proof_url_original);
  }

  // Handle signatures
  const addSignatureLine = (label: string) => {
    finalY += 20;
    if (finalY > 270) {
        doc.addPage();
        finalY = 30;
    }
    doc.line(40, finalY, 170, finalY); // line
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(label, 105, finalY + 5, { align: 'center' });
  };

  if (options.include_owner_signature) {
    addSignatureLine("Assinatura do Proprietário");
  }
  if (options.include_recipient_signature) {
    addSignatureLine("Assinatura do Destinatário");
  }

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], `comprovante_${accountData.name?.replace(/\s/g, '_') || 'conta'}.pdf`, { type: 'application/pdf' });
};