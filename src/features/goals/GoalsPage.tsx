import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { useProfile } from "@/features/profile/use-profile";
import { useFinance } from "@/features/finance/use-finance";
import { format } from "date-fns";

export function GoalsPage() {
  const { profile } = useProfile();
  const finance = useFinance();
  const month = format(new Date(), "yyyy-MM");
  const records = finance.commissions.filter((item) => item.sale_date?.startsWith(month) && item.status !== "cancelada");
  const registered = records.reduce((total, item) => total + item.net_commission, 0);
  const target = profile?.meta_comissao_mensal ?? 0;
  const receivedProgress = target ? Math.min((finance.metrics.commissionReceivedMonth / target) * 100, 100) : 0;
  const registeredProgress = target ? Math.min((registered / target) * 100, 100) : 0;
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">Metas</p>
        <h1 className="text-3xl font-semibold">Resumo mensal</h1>
      </header>
      <div className="grid gap-5 md:grid-cols-3">
        <GoalCard title="Comissão recebida" value={`${formatCurrency(finance.metrics.commissionReceivedMonth)} / ${formatCurrency(target)}`} progress={receivedProgress} />
        <GoalCard title="Comissão registrada" value={`${formatCurrency(registered)} / ${formatCurrency(target)}`} progress={registeredProgress} />
        <GoalCard title="Lançamentos do mês" value={`${records.length} ${records.length === 1 ? "registro" : "registros"}`} progress={records.length ? 100 : 0} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Meta financeira do corretor</CardTitle>
          <CardDescription>
            O progresso vem das comissões registradas manualmente no Financeiro. Não existe cálculo automático por imóvel ou VGV.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function GoalCard({ title, value, progress }: { title: string; value: string; progress: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Progresso atual</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-2xl font-semibold">{value}</p>
        <Progress value={progress} />
      </CardContent>
    </Card>
  );
}
