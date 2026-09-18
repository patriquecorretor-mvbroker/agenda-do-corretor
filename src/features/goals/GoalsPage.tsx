import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { useProfile } from "@/features/profile/use-profile";

export function GoalsPage() {
  const { profile } = useProfile();
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">Metas</p>
        <h1 className="text-3xl font-semibold">Resumo mensal</h1>
      </header>
      <div className="grid gap-5 md:grid-cols-3">
        <GoalCard title="Vendas" value={`0 / ${profile?.meta_vendas_mensal ?? 0}`} />
        <GoalCard title="VGV" value={`${formatCurrency(0)} / ${formatCurrency(profile?.meta_vgv_mensal)}`} />
        <GoalCard title="Comissão" value={`${formatCurrency(0)} / ${formatCurrency(profile?.meta_comissao_mensal)}`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pronto para expansão</CardTitle>
          <CardDescription>
            Este módulo usa apenas as metas do perfil. Vendas, financeiro e comissões entram em fases futuras.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function GoalCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Progresso atual</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-2xl font-semibold">{value}</p>
        <Progress value={0} />
      </CardContent>
    </Card>
  );
}
