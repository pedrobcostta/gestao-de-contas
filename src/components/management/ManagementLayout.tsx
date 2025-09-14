import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Account } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { AccountsTabContent } from "./AccountsTabContent";
import { PixTabContent } from "./PixTabContent";
import { BankAccountsTabContent } from "./BankAccountsTabContent";
import { PaidAccountsTabContent } from "./PaidAccountsTabContent";
import { ReportsTabContent } from "./ReportsTabContent";
import { ConfigurationTabContent } from "./ConfigurationTabContent";
import { UsersTabContent } from "./UsersTabContent";

interface ManagementLayoutProps {
  title: string;
  managementType: 'pessoal' | 'casa' | 'pai' | 'mae';
}

const ManagementLayout = ({ title, managementType }: ManagementLayoutProps) => {
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
      <h1 className="text-3xl font-bold">{title}</h1>

      {/* Resumo Consolidado */}
      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

      {/* Submenu e Conteúdo */}
      <Tabs defaultValue="contas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contas">Gestão de Contas</TabsTrigger>
          <TabsTrigger value="pix">Gestão de PIX</TabsTrigger>
          <TabsTrigger value="bancos">Gestão de Bancos</TabsTrigger>
          <TabsTrigger value="pagas">Contas Pagas</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="usuarios">Gestão de Usuários</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>
        <TabsContent value="contas">
          <Card>
            <CardHeader>
              <CardTitle>Contas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountsTabContent data={accounts} isLoading={isLoading} managementType={managementType} />
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
              <PaidAccountsTabContent managementType={managementType} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="relatorios">
          <ReportsTabContent managementType={managementType} />
        </TabsContent>
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
        <TabsContent value="config">
          <ConfigurationTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagementLayout;