import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from "@/integrations/supabase/client";
import { Account } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ReportsTabContentProps {
  managementType: Account["management_type"];
}

const COLORS = {
  "Pendente": "#FFBB28",
  "Pago": "#00C49F",
  "Vencido": "#FF8042",
};

export function ReportsTabContent({ managementType }: ReportsTabContentProps) {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', managementType],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('management_type', managementType);
      
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  if (isLoading) {
    return <p>Carregando relatórios...</p>;
  }

  // Process data for monthly summary chart
  const monthlyData = accounts.reduce((acc, account) => {
    const monthKey = format(parseISO(account.due_date), 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = 0;
    }
    acc[monthKey] += account.total_value;
    return acc;
  }, {} as { [key: string]: number });

  const chartData = Object.keys(monthlyData)
    .map(monthKey => ({
      date: new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 1),
      name: format(new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 1), 'MMM/yy', { locale: ptBR }),
      Total: monthlyData[monthKey],
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

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
          <CardTitle>Resumo Mensal de Despesas</CardTitle>
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