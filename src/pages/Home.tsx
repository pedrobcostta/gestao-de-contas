import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Account } from "@/types";
import { formatCurrency } from "@/lib/utils";

const managementTypeLabels: { [key: string]: string } = {
  pessoal: "Pessoal",
  casa: "Casa",
  pai: "Pai",
  mae: "Mãe",
};

const COLORS: { [key: string]: string } = {
  pessoal: "#8884d8",
  casa: "#82ca9d",
  pai: "#ffc658",
  mae: "#ff8042",
};

const Home = () => {
  const today = new Date();
  const startDate = startOfMonth(today);
  const endDate = endOfMonth(today);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['all_accounts', format(today, "yyyy-MM")],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .gte('due_date', format(startDate, "yyyy-MM-dd"))
        .lte('due_date', format(endDate, "yyyy-MM-dd"));
      
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const summary = accounts.reduce((acc, account) => {
    if (account.status === 'pago') {
      acc.paid += account.total_value;
    } else if (account.status === 'pendente') {
      acc.open += account.total_value;
    } else if (account.status === 'vencido') {
      acc.overdue += account.total_value;
    }
    return acc;
  }, { open: 0, paid: 0, overdue: 0 });

  const byManagementType = accounts.reduce((acc, account) => {
    const type = account.management_type;
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += account.total_value;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(byManagementType).map(key => ({
    name: managementTypeLabels[key],
    value: byManagementType[key],
    key: key,
  }));

  const upcomingAccounts = accounts
    .filter(acc => acc.status === 'pendente' && new Date(`${acc.due_date}T00:00:00`) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="text-center">
        <p className="text-xl text-gray-600">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Geral - {format(today, "MMMM 'de' yyyy", { locale: ptBR })}</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Abertas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.open)}</div>
            <p className="text-xs text-muted-foreground">Total de contas pendentes no mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.paid)}</div>
            <p className="text-xs text-muted-foreground">Total pago este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.overdue)}</div>
            <p className="text-xs text-muted-foreground">Total de contas vencidas no mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Próximas Contas a Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAccounts.length > 0 ? (
              <ul className="space-y-3">
                {upcomingAccounts.map(account => (
                  <li key={account.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Vence em: {format(new Date(`${account.due_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(account.total_value)}</p>
                      <p className="text-sm text-muted-foreground">{managementTypeLabels[account.management_type]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">
                Nenhuma conta pendente para os próximos dias.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;