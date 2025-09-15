import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Account, BankAccount, Profile, CustomAttachment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const addHeader = (doc: jsPDF, title: string) => {
  doc.setFontSize(18);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  doc.line(14, 25, doc.internal.pageSize.getWidth() - 14, 25);
};

const addSection = (doc: jsPDF, title: string, body: (string | null)[][], startY: number): number => {
  const filteredBody = body.filter(row => row[1] !== null && row[1] !== undefined && row[1] !== '');
  if (filteredBody.length === 0) return startY;
  
  let finalY = startY;
  if (finalY + 20 > doc.internal.pageSize.height) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(14);
  doc.text(title, 14, finalY);
  
  autoTable(doc, {
    startY: finalY + 5,
    theme: 'striped',
    head: [['Descrição', 'Valor']],
    body: filteredBody,
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

const addAttachmentsToPdf = async (doc: jsPDF, attachments: CustomAttachment[], startY: number): Promise<number> => {
  let finalY = startY;
  if (attachments.length === 0) return finalY;

  if (finalY + 20 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
  doc.setFontSize(14);
  doc.text("Anexos", 14, finalY);
  finalY += 10;

  for (const attachment of attachments) {
    try {
      // This assumes attachments are images. For other file types, this would need adjustment.
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const reader = new FileReader();
      const dataUrl = await new Promise<string>(resolve => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const imgProps = doc.getImageProperties(dataUrl);
      const imgWidth = 180;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      if (finalY + imgHeight + 15 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
      
      doc.setFontSize(10);
      doc.text(`Anexo: ${attachment.name}`, 14, finalY);
      doc.addImage(dataUrl, 'JPEG', 14, finalY + 5, imgWidth, imgHeight);
      finalY += imgHeight + 15;
    } catch (e) {
      console.error(`Erro ao adicionar anexo ${attachment.name} ao PDF:`, e);
    }
  }
  return finalY;
};

const addSignatures = (doc: jsPDF, startY: number) => {
  let y = startY + 20;
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 40;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const lineLength = 80;
  const startXRemetente = (pageWidth / 4) - (lineLength / 2);
  const startXDestinatario = (pageWidth * 3 / 4) - (lineLength / 2);

  doc.line(startXRemetente, y, startXRemetente + lineLength, y);
  doc.text("Remetente", startXRemetente + lineLength / 2, y + 5, { align: 'center' });

  doc.line(startXDestinatario, y, startXDestinatario + lineLength, y);
  doc.text("Destinatário", startXDestinatario + lineLength / 2, y + 5, { align: 'center' });
};

export const generateCustomBillPdf = async (
  accountData: any, 
  paymentBank: BankAccount | null, 
  profile: Profile | null, 
  options: any,
  attachments: CustomAttachment[]
): Promise<File> => {
  const doc = new jsPDF();
  addHeader(doc, "Fatura / Conta");

  // Section 1: Account Details
  const accountBody: (string | null)[][] = [];
  if (options.include_name) accountBody.push(["Nome da Conta", accountData.name]);
  if (options.include_total_value) accountBody.push(["Valor", formatCurrency(accountData.total_value)]);
  if (options.include_due_date) accountBody.push(["Vencimento", format(accountData.due_date, "dd/MM/yyyy", { locale: ptBR })]);
  if (options.include_status) accountBody.push(["Status", accountData.status]);
  if (options.include_account_type) accountBody.push(["Tipo", accountData.account_type]);
  if (accountData.account_type === 'parcelada' && options.include_installments) {
    accountBody.push(["Parcela", `${accountData.installment_current}/${accountData.installments_total}`]);
  }
  if (options.include_notes) accountBody.push(["Observações", accountData.notes]);
  let finalY = addSection(doc, "Detalhes da Conta", accountBody, 35);

  // Section 2: Payment Details
  const paymentBody: (string | null)[][] = [];
  if (options.include_payment_date && accountData.payment_date) {
    paymentBody.push(["Data de Pagamento", format(accountData.payment_date, "dd/MM/yyyy", { locale: ptBR })]);
  }
  if (options.include_payment_method) paymentBody.push(["Método", accountData.payment_method]);
  if (options.include_fees_and_fines) paymentBody.push(["Juros/Multas", formatCurrency(accountData.fees_and_fines)]);
  if (options.include_payment_bank_details && paymentBank) {
    paymentBody.push(["Banco", paymentBank.bank_name]);
    paymentBody.push(["Titular", paymentBank.owner_name]);
    paymentBody.push(["CPF", paymentBank.owner_cpf]);
    if (paymentBank.account_type !== 'cartao_credito') {
      paymentBody.push(['Agência', paymentBank.agency]);
      paymentBody.push(['Conta', paymentBank.account_number]);
    } else {
      paymentBody.push(['Final do Cartão', paymentBank.card_last_4_digits]);
    }
  }
  finalY = addSection(doc, "Detalhes de Pagamento", paymentBody, finalY);

  // Section 3: Profile Details
  const profileBody: (string | null)[][] = [];
  if (profile && options.include_profile_fields) {
    if (options.include_profile_fields.full_name) profileBody.push(["Nome Completo", `${profile.first_name || ''} ${profile.last_name || ''}`.trim()]);
    if (options.include_profile_fields.cpf) profileBody.push(["CPF", profile.cpf]);
    if (options.include_profile_fields.rg) profileBody.push(["RG", profile.rg]);
  }
  finalY = addSection(doc, "Dados do Perfil", profileBody, finalY);

  // Section 4: Attachments
  if (options.include_attachments) {
    finalY = await addAttachmentsToPdf(doc, attachments, finalY);
  }

  addSignatures(doc, finalY);

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], `fatura_${accountData.name.replace(/\s/g, '_')}.pdf`, { type: 'application/pdf' });
};

export const generateFullReportPdf = async (
  accountData: any, relatedInstallments: Account[], paymentBank: BankAccount | null
): Promise<File> => {
  const doc = new jsPDF();
  addHeader(doc, `Relatório da Conta: ${accountData.name}`);

  const accountBody = [
    ['Nome', accountData.name],
    ['Valor', formatCurrency(accountData.total_value)],
    ['Vencimento', format(new Date(`${accountData.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })],
    ['Status', accountData.status],
    ['Tipo', accountData.account_type],
    ['Observações', accountData.notes],
  ];
  let finalY = addSection(doc, "Detalhes da Conta", accountBody, 35);

  const paymentBody: (string | null)[][] = [];
  if (accountData.payment_date) {
    paymentBody.push(['Data Pagamento', format(new Date(`${accountData.payment_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })]);
  }
  paymentBody.push(['Método', accountData.payment_method]);
  if (paymentBank) {
    paymentBody.push(["Banco", paymentBank.bank_name]);
    paymentBody.push(["Titular", paymentBank.owner_name]);
    paymentBody.push(["CPF", paymentBank.owner_cpf]);
  }
  finalY = addSection(doc, "Detalhes de Pagamento", paymentBody, finalY);

  if (accountData.account_type === 'parcelada' && relatedInstallments.length > 0) {
    if (finalY + 20 > doc.internal.pageSize.height) { doc.addPage(); finalY = 20; }
    doc.setFontSize(14);
    doc.text("Parcelas", 14, finalY);
    autoTable(doc, {
      startY: finalY + 5,
      head: [['#', 'Vencimento', 'Valor', 'Status']],
      body: relatedInstallments.map(inst => [
        `${inst.installment_current}/${inst.installments_total}`,
        format(new Date(`${inst.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }),
        formatCurrency(inst.total_value),
        inst.status
      ]),
    });
    finalY = (doc as any).lastAutoTable.finalY;
  }

  const allAttachments: CustomAttachment[] = [
    { name: "Fatura (Gerada)", url: accountData.system_generated_bill_url },
    { name: "Fatura (Upload)", url: accountData.bill_proof_url },
    { name: "Comprovante", url: accountData.payment_proof_url },
    ...(accountData.other_attachments || [])
  ].filter(att => att.url) as CustomAttachment[];

  finalY = await addAttachmentsToPdf(doc, allAttachments, finalY + 10);

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], `relatorio_${accountData.name.replace(/\s/g, '_')}.pdf`, { type: 'application/pdf' });
};