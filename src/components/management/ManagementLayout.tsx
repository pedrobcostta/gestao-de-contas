import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CheckCircle, AlertTriangle } from "lucide-react";

interface ManagementLayoutProps {
  title: string;
  managementType: 'pessoal' | 'casa' | 'pai' | 'mae';
}

const ManagementLayout = ({ title }: ManagementLayoutProps) => {
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
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Total de contas pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Total pago este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
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
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>
        <TabsContent value="contas">
          <Card>
            <CardHeader>
              <CardTitle>Contas do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <p>A tabela de contas e os filtros aparecerão aqui.</p>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Outros TabsContent virão aqui no futuro */}
      </Tabs>
    </div>
  );
};

export default ManagementLayout;