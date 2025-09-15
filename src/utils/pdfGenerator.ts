import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Account, BankAccount, Profile } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getLogoBase64 = async (): Promise<string> => {
  try {
    const response = await fetch('/logo-jpc-transparente.png');
    if (!response.ok) return '';
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching logo:", error);
    return '';
  }
};

const addHeader = (doc: jsPDF, title: string, logoBase64: string) => {
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 14, 10, 40, 15);
  }
  doc.setFontSize(18);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  doc.line(14, 30, doc.internal.pageSize.getWidth() - 14, 30);
};

const addBankDetails = (doc: jsPDF, paymentBank: BankAccount, startY: number): number => {
  if (!paymentBank) return startY;
  
  let finalY = startY;
  if (finalY + 20 > doc.internal.pageSize.height) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(12);
  doc.text("Detalhes do Pagamento", 14, finalY);
  
  const body = [
    ['Banco', paymentBank.bank_name],
    ['Titular', paymentBank.owner_name],
    ['CPF', paymentBank.owner_cpf],
  ];
  if (paymentBank.account_type !== 'cartao_credito') {
    body.push(['Agência', paymentBank.agency || 'N/A']);
    body.push(['Conta', paymentBank.account_number || 'N/A']);
  } else {
    body.push(['Final do Cartão', paymentBank.card_last_4_digits || 'N/A']);
  }

  autoTable(doc, {
    startY: finalY + 5,
    theme: 'striped',
    head: [['Descrição', 'Valor']],
    body: body.map(row => [row[0], row[1] || '']),
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

const addRow = (body: (string | undefined)[][], label: string, value: any, option: boolean) => {
  if (option && value) {
    body.push([label, String(value)]);
  }
};

export const generateCustomBillPdf = async (
  accountData: any, paymentBank: BankAccount | null, profile: Profile | null, options: any
): Promise<File> => {
  const doc = new jsPDF();
  const logoBase64 = await getLogoBase64();
  addHeader(doc, "Fatura / Conta", logoBase64);

  if (profile?.first_name) {
    doc.setFontSize(10);
    doc.text(`Gerado por: ${profile.first_name} ${profile.last_name || ''}`, 14, 38);
  }

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
  addRow(body, "Juros e Multas", formatCurrency(accountData.fees_and_fines), options.include_fees_and_fines);
  addRow(body, "Observações", accountData.notes, options.include_notes);

  autoTable(doc, {
    startY: 45,
    head: [['Descrição', 'Detalhe']],
    body: body,
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  if (options.include_payment_bank_details && paymentBank) {
    finalY = addBankDetails(doc, paymentBank, finalY);
  }

  const addQrCode = async (label: string, url: string | null | undefined, option: boolean) => {
    if (option && url) {
      try {
        const qrCodeImage = await QRCode.toDataURL(url);
        if (finalY + 40 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
        doc.setFontSize(10);
        doc.text(label, 14, finalY);
        doc.addImage(qrCodeImage, 'PNG', 14, finalY + 2, 30, 30);
        finalY += 40;
      } catch (err) { console.error("Failed to generate QR code", err); }
    }
  };

  await addQrCode("QR Code - Fatura/Conta", accountData.bill_proof_url_original, options.include_bill_proof);
  await addQrCode("QR Code - Comprovante", accountData.payment_proof_url_original, options.include_payment_proof);

  if (options.include_owner_signature || options.include_recipient_signature) {
    if (finalY + 20 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
    if (options.include_owner_signature) {
      doc.text("________________________", 14, finalY + 10);
      doc.text("Assinatura do Proprietário", 15, finalY + 15);
    }
    if (options.include_recipient_signature) {
      doc.text("________________________", 110, finalY + 10);
      doc.text("Assinatura do Destinatário", 111, finalY + 15);
    }
  }

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], `fatura_${accountData.name.replace(/ /g, '_')}.pdf`, { type: 'application/pdf' });
};

export const generateFullReportPdf = async (
  accountData: any, relatedInstallments: Account[], paymentBank: BankAccount | null
): Promise<File> => {
  const doc = new jsPDF();
  const logoBase64 = await getLogoBase64();
  addHeader(doc, `Relatório da Conta: ${accountData.name}`, logoBase64);

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
    startY: 40,
    head: [['Detalhe', 'Valor']],
    body: body.map(row => [row[0], row[1] || '']),
  });

  let finalY = (doc as any).lastAutoTable.finalY + 5;

  finalY = addBankDetails(doc, paymentBank!, finalY);

  if (accountData.account_type === 'parcelada' && relatedInstallments.length > 0) {
    if (finalY + 20 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
    doc.text("Detalhes das Parcelas", 14, finalY);
    autoTable(doc, {
      startY: finalY + 5,
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

  finalY += 10;
  if (finalY + 10 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
  doc.setFontSize(12);
  doc.text("Anexos (QR Codes)", 14, finalY);
  finalY += 5;

  const addQrCodeToReport = async (label: string, url: string | null | undefined, startY: number): Promise<number> => {
    let currentY = startY;
    if (url) {
      try {
        const qrCodeImage = await QRCode.toDataURL(url);
        if (currentY + 40 > doc.internal.pageSize.height) { doc.addPage(); currentY = 20; }
        doc.setFontSize(10);
        doc.text(label, 14, currentY);
        doc.addImage(qrCodeImage, 'PNG', 14, currentY + 2, 30, 30);
        currentY += 40;
      } catch (err) { console.error(`Failed to generate QR code for ${label}`, err); }
    }
    return currentY;
  };

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