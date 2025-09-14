import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { DateRange } from "react-day-picker";

import { supabase } from "@/integrations/supabase/client";
import { Account } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatCurrency } from "@/lib/utils";
import { showError, showSuccess } from "@/utils/toast";

interface ReportsTabContentProps {
  managementType: Account["management_type"];
}

const COLORS = {
  "Pendente": "#FFBB28",
  "Pago": "#00C49F",
  "Vencido": "#FF8042",
};

const getImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
};

export function ReportsTabContent({ managementType }: ReportsTabContentProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [reportType, setReportType] = useState('completo');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts_report', managementType, dateRange],
    queryFn: async (): Promise<Account[]> => {
      if (!dateRange?.from || !dateRange?.to) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('management_type', managementType)
        .gte('due_date', format(dateRange.from, "yyyy-MM-dd"))
        .lte('due_date', format(dateRange.to, "yyyy-MM-dd"));
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!dateRange?.from && !!dateRange?.to,
  });

  const filteredAccounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (reportType) {
      case 'pagas':
        return accounts.filter(acc => acc.status === 'pago');
      case 'vencidas':
        return accounts.filter(acc => acc.status === 'vencido' || (acc.status === 'pendente' && isBefore(parseISO(`${acc.due_date}T00:00:00`), today)));
      case 'a_pagar':
        return accounts.filter(acc => acc.status === 'pendente' && !isBefore(parseISO(`${acc.due_date}T00:00:00`), today));
      case 'completo':
      default:
        return accounts;
    }
  }, [accounts, reportType]);

  const handleExportTXT = () => {
    let content = `Relatório de Contas - ${reportType.toUpperCase()}\n`;
    content += `Período: ${format(dateRange!.from!, 'dd/MM/yyyy')} a ${format(dateRange!.to!, 'dd/MM/yyyy')}\n\n`;
    
    filteredAccounts.forEach(acc => {
      content += `----------------------------------------\n`;
      content += `Nome: ${acc.name}\n`;
      content += `Valor: ${formatCurrency(acc.total_value)}\n`;
      content += `Vencimento: ${format(parseISO(`${acc.due_date}T00:00:00`), 'dd/MM/yyyy')}\n`;
      content += `Status: ${acc.status}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio.txt';
    link.click();
    URL.revokeObjectURL(url);
    showSuccess("Relatório TXT gerado com sucesso!");
  };

  const handleExportPDF = async () => {
    const toastId = showLoading("Gerando PDF... Isso pode levar alguns segundos.");
    try {
      const doc = new jsPDF();
      doc.text(`Relatório de Contas - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Período: ${format(dateRange!.from!, 'dd/MM/yyyy')} a ${format(dateRange!.to!, 'dd/MM/yyyy')}`, 14, 22);

      autoTable(doc, {
        startY: 30,
        head: [['Nome', 'Vencimento', 'Valor', 'Status']],
        body: filteredAccounts.map(acc => [
          acc.name,
          format(parseISO(`${acc.due_date}T00:00:00`), 'dd/MM/yyyy'),
          formatCurrency(acc.total_value),
          acc.status,
        ]),
      });

      const accountsWithProof = filteredAccounts.filter(acc => acc.payment_proof_url);
      if (accountsWithProof.length > 0) {
        doc.addPage();
        doc.text("Comprovantes de Pagamento", 14, 16);
        let y = 25;

        for (const acc of accountsWithProof) {
          try {
            const imgData = await getImageAsBase64(acc.payment_proof_url!);
            const imgProps = doc.getImageProperties(imgData);
            const imgWidth = 180;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            
            if (y + imgHeight + 15 > doc.internal.pageSize.getHeight()) {
              doc.addPage();
              y = 15;
            }
            
            doc.setFontSize(10);
            doc.text(`Comprovante: ${acc.name}`, 14, y);
            doc.addImage(imgData, 'JPEG', 14, y + 5, imgWidth, imgHeight);
            y += imgHeight + 15;

          } catch (e) {
            console.error(`Erro ao carregar imagem para ${acc.name}:`, e);
          }
        }
      }

      doc.save('relatorio.pdf');
      showSuccess("Relatório PDF gerado com sucesso!");
    } catch (error) {
      showError("Ocorreu um erro ao gerar o PDF.");
      console.error(error);
    } finally {
      dismissToast(toastId);
    }
  };

  // Data for charts
  const statusData = filteredAccounts.reduce((acc, account) => {
    const status = account.status.charAt(0).toUpperCase() + account.status.slice(1);
    const existing = acc.find(item => item.name === status);
    if (existing) {
      existing.value += account.total_value;
    } else {
      acc.push({ name: status, value: account.total_value });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <CardDescription>Selecione o período e o tipo de relatório para gerar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Tipo de Relatório" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completo">Relatório Completo</SelectItem>
              <SelectItem value="pagas">Contas Pagas</SelectItem>
              <SelectItem value="vencidas">Contas Vencidas</SelectItem>
              <SelectItem value="a_pagar">Contas a Pagar</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} disabled={isLoading}>Exportar PDF</Button>
            <Button onClick={handleExportTXT} variant="outline" disabled={isLoading}>Exportar TXT</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? <p>Carregando relatórios...</p> : (
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}