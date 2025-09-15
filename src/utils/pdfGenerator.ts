import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Account, BankAccount, Profile, CustomAttachment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Helper to add a row if the option is enabled
const addRow = (body: (string | undefined)[][], label: string, value: any, option: boolean) => {
  if (option && value) {
    body.push([label, String(value)]);
  }
};

export const generateCustomBillPdf = async (
  accountData: any, bankAccounts: BankAccount[], profile: Profile | null, last4Digits: string, options: any
): Promise<File> => {
  const doc = new jsPDF();
  const paymentBank = bankAccounts.find(b => b.id === accountData.payment_bank_id);

  // Header
  doc.setFontSize(18);
  doc.text("Fatura / Conta", 14, 22);
  if (profile?.first_name) {
    doc.setFontSize(12);
    doc.text(`Gerado por: ${profile.first_name} ${profile.last_name || ''}`, 14, 30);
  }

  // Body
  const body: (string | undefined)[][] = [];
  addRow(body, "Nome da Conta", accountData.name, options.include_name);
  addRow(body, "Valor", formatCurrency(accountData.total_value), options.include_total_value);
  addRow(body, "Data de Vencimento", format(accountData.due_date, "dd/MM/yyyy", { locale: ptBR }), options.include_due_date);
  addRow(body, "Status", accountData.status, options.include_status);
  addRow(body, "Tipo de Conta", accountData.account_type, options.include_account_type);
  if (accountData.account_type === 'parcelada') {
    addRow(body, "Parcela", `${accountData.installment_current}/${accountData.installments_total}`, options.include_installments);
  }
  addRow(body, "Data de Pagamento", accountData.payment_date ? format(accountData.payment_date, "dd/MM/yyyy", { locale: ptBR }) : undefined, options.include_payment_date);
  addRow(body, "Método de Pagamento", accountData.payment_method, options.include_payment_method);
  if (paymentBank) {
    let bankInfo = `${paymentBank.account_name} - ${paymentBank.bank_name}`;
    if (paymentBank.account_type === 'cartao_credito' && last4Digits) {
      bankInfo += ` (final ${last4Digits})`;
    }
    addRow(body, "Banco de Pagamento", bankInfo, options.include_payment_bank);
  }
  addRow(body, "Juros e Multas", formatCurrency(accountData.fees_and_fines), options.include_fees_and_fines);
  addRow(body, "Observações", accountData.notes, options.include_notes);

  autoTable(doc, {
    startY: 40,
    head: [['Descrição', 'Detalhe']],
    body: body,
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // QR Codes for attachments
  const addQrCode = async (label: string, url: string | null | undefined, option: boolean) => {
    if (option && url) {
      try {
        const qrCodeImage = await QRCode.toDataURL(url);
        if (finalY + 40 > doc.internal.pageSize.height) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFontSize(10);
        doc.text(label, 14, finalY);
        doc.addImage(qrCodeImage, 'PNG', 14, finalY + 2, 30, 30);
        finalY += 40;
      } catch (err) {
        console.error("Failed to generate QR code", err);
      }
    }
  };

  await addQrCode("QR Code - Fatura/Conta", accountData.bill_proof_url_original, options.include_bill_proof);
  await addQrCode("QR Code - Comprovante", accountData.payment_proof_url_original, options.include_payment_proof);

  // Signatures
  if (options.include_owner_signature) {
    if (finalY + 20 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
    doc.text("________________________", 14, finalY + 10);
    doc.text("Assinatura do Proprietário", 15, finalY + 15);
  }
  if (options.include_recipient_signature) {
    if (finalY + 20 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
    doc.text("________________________", 110, finalY + 10);
    doc.text("Assinatura do Destinatário", 111, finalY + 15);
  }

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], `fatura_${accountData.name.replace(/ /g, '_')}.pdf`, { type: 'application/pdf' });
};

export const generateFullReportPdf = async (
  accountData: any, relatedInstallments: Account[]
): Promise<File> => {
  const doc = new jsPDF();

  const addQrCodeToReport = async (label: string, url: string | null | undefined, startY: number): Promise<number> => {
    let finalY = startY;
    if (url) {
      try {
        const qrCodeImage = await QRCode.toDataURL(url);
        if (finalY + 40 > doc.internal.pageSize.height) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFontSize(10);
        doc.text(label, 14, finalY);
        doc.addImage(qrCodeImage, 'PNG', 14, finalY + 2, 30, 30);
        finalY += 40;
      } catch (err) {
        console.error(`Failed to generate QR code for ${label}`, err);
      }
    }
    return finalY;
  };

  doc.text(`Relatório Completo da Conta: ${accountData.name}`, 14, 22);

  const body = [
    ['Nome', accountData.name],
    ['Valor', formatCurrency(accountData.total_value)],
    ['Vencimento', format(new Date(`${accountData.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })],
    ['Status', accountData.status],
    ['Tipo', accountData.account_type],
  ];
  if (accountData.payment_date) {
    body.push(['Data Pagamento', format(new Date(`${accountData.payment_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })]);
  }
  if (accountData.notes) {
    body.push(['Observações', accountData.notes]);
  }

  autoTable(doc, {
    startY: 30,
    head: [['Detalhe', 'Valor']],
    body: body,
  });

  let finalY = (doc as any).lastAutoTable.finalY;

  if (accountData.account_type === 'parcelada' && relatedInstallments.length > 0) {
    doc.text("Detalhes das Parcelas", 14, finalY + 10);
    autoTable(doc, {
      startY: finalY + 15,
      head: [['Parcela', 'Vencimento', 'Valor', 'Status']],
      body: relatedInstallments.map(inst => [
        `${inst.installment_current}/${inst.installments_total}`,
        format(new Date(`${inst.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }),
        formatCurrency(inst.total_value),
        inst.status
      ]),
    });
    finalY = (doc as any).lastAutoTable.finalY;
  }

  // Add attachments section
  finalY += 10;
  if (finalY + 10 > doc.internal.pageSize.height) {
    doc.addPage();
    finalY = 20;
  }
  doc.setFontSize(12);
  doc.text("Anexos (QR Codes)", 14, finalY);
  finalY += 5;

  finalY = await addQrCodeToReport("Fatura (Gerada pelo Sistema)", accountData.system_generated_bill_url, finalY);
  finalY = await addQrCodeToReport("Fatura/Conta (Upload)", accountData.bill_proof_url, finalY);
  finalY = await addQrCodeToReport("Comprovante de Pagamento", accountData.payment_proof_url, finalY);

  if (accountData.other_attachments && accountData.other_attachments.length > 0) {
    for (const attachment of accountData.other_attachments) {
      finalY = await addQrCodeToReport(`Anexo: ${attachment.name}`, attachment.url, finalY);
    }
  }

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], `relatorio_completo_${accountData.name.replace(/ /g, '_')}.pdf`, { type: 'application/pdf' });
};