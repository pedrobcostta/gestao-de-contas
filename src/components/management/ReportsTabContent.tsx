import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from "@/integrations/supabase/client";
import { Account } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ReportsTabContentProps {
  managementType: Account["management_type"];
  selectedYear: number;
  selectedMonth: number;
}

const COLORS = {
  "Pendente": "#FFBB28",
  "Pago": "#00C49F",
  "Vencido": "#FF8042",
};

export function ReportsTabContent({ managementType, selectedYear, selectedMonth }: ReportsTabContentProps) {
  const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
  const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', managementType, selectedYear, selectedMonth, 'reports'],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('management_type', managementType)
        .gte('due_date', format(startDate, "yyyy-MM-dd"))
        .lte('due_date', format(endDate, "yyyy-MM-dd"));
      
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  if (isLoading) {
    return <p>Carregando relatórios...</p>;
  }

  // Process data for monthly summary chart (now daily for the selected month)
  const dailyData = accounts.reduce((acc, account) => {
    const dayKey = format(parseISO(account.due_date), 'dd/MM');
    if (!acc[dayKey]) {
      acc[dayKey] = 0;
    }
    acc[dayKey] += account.total_value;
    return acc;
  }, {} as { [key: string]: number });

  const chartData = Object.keys(dailyData)
    .map(dayKey => ({
      name: dayKey,
      Total: dailyData[dayKey],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Process data for status pie chart
  const statusData = accounts.reduce((acc, account) => {
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
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Despesas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="Total" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
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
    </div>
  );
}