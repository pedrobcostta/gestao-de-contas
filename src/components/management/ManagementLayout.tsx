import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Account, Profile } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { AccountsTabContent } from "./AccountsTabContent";
import { PixTabContent } from "./PixTabContent";
import { BankAccountsTabContent } from "./BankAccountsTabContent";
import { PaidAccountsTabContent } from "./PaidAccountsTabContent";
import { ReportsTabContent } from "./ReportsTabContent";
import { ConfigurationTabContent } from "./ConfigurationTabContent";
import { UsersTabContent } from "./UsersTabContent";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useAuth } from "@/contexts/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";

interface ManagementLayoutProps {
  title: string;
  managementType: 'pessoal' | 'casa' | 'pai' | 'mae';
}

const months = [
  { value: 0, label: "Janeiro" }, { value: 1, label: "Fevereiro" }, { value: 2, label: "Março" },
  { value: 3, label: "Abril" }, { value: 4, label: "Maio" }, { value: 5, label: "Junho" },
  { value: 6, label: "Julho" }, { value: 7, label: "Agosto" }, { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" }, { value: 10, label: "Novembro" }, { value: 11, label: "Dezembro" },
];

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

const ManagementLayout = ({ title, managementType }: ManagementLayoutProps) => {
  const { session } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('todas');
  const [typeFilter, setTypeFilter] = useState('todas');

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (error) {
        console.error("Error fetching profile role:", error);
        return null;
      }
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const isAdmin = profile?.role === 'admin';

  const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
  const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', managementType, selectedYear, selectedMonth],
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

  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const statusMatch = statusFilter === 'todas' || account.status === statusFilter;
      const typeMatch = typeFilter === 'todas' || account.account_type === typeFilter;
      return statusMatch && typeMatch;
    });
  }, [accounts, statusFilter, typeFilter]);

  const processedData = useMemo(() => {
    const groups = new Map<string, Account[]>();
    const singleAccounts: (Account & { subRows?: Account[] })[] = [];

    for (const account of filteredAccounts) {
      if (account.account_type === 'parcelada' && account.group_id) {
        if (!groups.has(account.group_id)) {
          groups.set(account.group_id, []);
        }
        groups.get(account.group_id)!.push(account);
      } else {
        singleAccounts.push(account);
      }
    }

    const groupedAccounts: (Account & { subRows?: Account[] })[] = [];
    for (const [groupId, subRows] of groups.entries()) {
      subRows.sort((a, b) => (a.installment_current || 0) - (b.installment_current || 0));
      
      const firstInstallment = subRows[0];
      const totalValue = subRows.reduce((sum, inst) => sum + inst.total_value, 0);
      
      let parentStatus: Account['status'] = 'pago';
      if (subRows.some(inst => inst.status === 'vencido')) {
        parentStatus = 'vencido';
      } else if (subRows.some(inst => inst.status === 'pendente')) {
        parentStatus = 'pendente';
      }

      const parentRow: Account & { subRows: Account[] } = {
        ...firstInstallment,
        id: groupId,
        total_value: totalValue,
        status: parentStatus,
        name: firstInstallment.name,
        installment_current: null,
        subRows: subRows,
      };
      groupedAccounts.push(parentRow);
    }

    return [...singleAccounts, ...groupedAccounts].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [filteredAccounts]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <div className="flex gap-2 flex-wrap justify-start md:justify-end">
          <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filtrar por Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os Tipos</SelectItem>
              <SelectItem value="unica">Única</SelectItem>
              <SelectItem value="parcelada">Parcelada</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contas Abertas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.open)}</div>
                <p className="text-xs text-muted-foreground">Total de contas pendentes</p>
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
                <p className="text-xs text-muted-foreground">Total de contas vencidas</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="contas" className="space-y-4">
        <TabsList className="overflow-x-auto w-full justify-start">
          <TabsTrigger value="contas">Gestão de Contas</TabsTrigger>
          <TabsTrigger value="pix">Gestão de PIX</TabsTrigger>
          <TabsTrigger value="bancos">Gestão de Bancos</TabsTrigger>
          <TabsTrigger value="pagas">Contas Pagas</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          {isAdmin && <TabsTrigger value="usuarios">Gestão de Usuários</TabsTrigger>}
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>
        <TabsContent value="contas">
          <Card>
            <CardHeader>
              <CardTitle>Contas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountsTabContent data={processedData} isLoading={isLoading} managementType={managementType} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pix">
          <Card>
            <CardHeader>
              <CardTitle>Chaves PIX</CardTitle>
            </CardHeader>
            <CardContent>
              <PixTabContent managementType={managementType} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bancos">
          <Card>
            <CardHeader>
              <CardTitle>Contas Bancárias e Cartões</CardTitle>
            </CardHeader>
            <CardContent>
              <BankAccountsTabContent managementType={managementType} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pagas">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Contas Pagas</CardTitle>
            </CardHeader>
            <CardContent>
              <PaidAccountsTabContent managementType={managementType} selectedYear={selectedYear} selectedMonth={selectedMonth} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="relatorios">
          <ReportsTabContent managementType={managementType} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle>Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <UsersTabContent />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="config">
          <ConfigurationTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagementLayout;