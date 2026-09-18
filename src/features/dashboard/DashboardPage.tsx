import { useMemo, useState } from "react";
import { format, isBefore, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck2, CheckCircle2, CloudSun, Clock, ListChecks, Target, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { clampPercent, formatCurrency } from "@/lib/utils";
import { useEvents } from "@/features/calendar/use-events";
import { useTasks } from "@/features/tasks/use-tasks";
import { useProfile } from "@/features/profile/use-profile";
import { getWeather, weatherMessage } from "@/features/dashboard/weather-service";
import type { AppView } from "@/types/ui";

const phrases = [
  "Consistência gera resultado.",
  "Quem acompanha bem, vende melhor.",
  "O próximo sim pode estar no próximo retorno.",
  "Agenda organizada, energia preservada.",
  "Pequenas ações diárias constroem grandes meses."
];

export function DashboardPage({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { profile } = useProfile();
  const { events, isLoading: loadingEvents, updateEvent } = useEvents(today);
  const { tasks, isLoading: loadingTasks, updateTask } = useTasks();
  const { toast } = useToast();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [tomorrowNotes, setTomorrowNotes] = useState("");

  const weatherQuery = useQuery({
    queryKey: ["weather", profile?.cidade],
    queryFn: () => getWeather(profile?.cidade),
    enabled: Boolean(profile)
  });

  const todayTasks = tasks.filter((task) => task.due_date && isToday(parseISO(task.due_date)));
  const pendingTasks = tasks.filter((task) => task.status === "pendente");
  const completedTasks = tasks.filter((task) => task.status === "concluída");
  const completedEvents = events.filter((event) => event.status === "concluído");
  const overdueEvents = events.filter((event) => event.status === "agendado" && event.start_time < format(new Date(), "HH:mm"));
  const dailyGoalTotal = Math.max(events.length + todayTasks.length, 1);
  const dailyDone = completedEvents.length + todayTasks.filter((task) => task.status === "concluída").length;
  const dailyProgress = clampPercent((dailyDone / dailyGoalTotal) * 100);

  const priorities = useMemo(() => {
    return tasks
      .filter((task) => task.status === "pendente")
      .filter((task) => {
        if (!task.due_date) return task.priority === "alta";
        const due = parseISO(task.due_date);
        return isBefore(due, new Date()) || isToday(due) || task.priority === "alta";
      })
      .sort((a, b) => {
        const aOverdue = a.due_date ? isBefore(parseISO(a.due_date), new Date()) && !isToday(parseISO(a.due_date)) : false;
        const bOverdue = b.due_date ? isBefore(parseISO(b.due_date), new Date()) && !isToday(parseISO(b.due_date)) : false;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (a.priority !== b.priority) return a.priority === "alta" ? -1 : 1;
        return (a.due_time ?? "99:99").localeCompare(b.due_time ?? "99:99");
      })
      .slice(0, 5);
  }, [tasks]);

  async function finishDay() {
    const tomorrow = format(new Date(Date.now() + 86_400_000), "yyyy-MM-dd");
    const pendingToday = tasks.filter((task) => task.status === "pendente" && task.due_date === today);
    await Promise.all(
      pendingToday.map((task) => updateTask.mutateAsync({ id: task.id, input: { due_date: tomorrow } }))
    );
    toast({ title: "Tarefas pendentes movidas para amanhã." });
    setSummaryOpen(false);
  }

  const phrase = phrases[new Date().getDate() % phrases.length];
  const greeting = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-primary p-5 text-primary-foreground shadow-soft md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm opacity-75">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-5xl">
              {greeting}, {profile?.nome?.split(" ")[0] ?? "corretor"}
            </h1>
            <p className="mt-3 text-sm opacity-80">
              {format(new Date(), "HH:mm")} • {profile?.cidade ?? "Cidade não informada"}
            </p>
          </div>
          <WeatherMini weather={weatherQuery.data} loading={weatherQuery.isLoading} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard icon={CalendarCheck2} label="Compromissos hoje" value={events.length} onClick={() => onNavigate("agenda")} />
        <SummaryCard icon={ListChecks} label="Tarefas pendentes" value={pendingTasks.length} onClick={() => onNavigate("agenda")} />
        <SummaryCard icon={CheckCircle2} label="Tarefas concluídas" value={completedTasks.length} />
        <SummaryCard icon={Target} label="Meta diária" value={`${dailyProgress}%`} />
        <SummaryCard icon={TrendingUp} label="Progresso mensal" value="0%" onClick={() => onNavigate("goals")} />
        <SummaryCard icon={Clock} label="Atrasados" value={overdueEvents.length} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Agenda de hoje</CardTitle>
            <CardDescription>Linha do tempo dos compromissos principais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingEvents ? (
              <Skeleton className="h-36" />
            ) : events.length ? (
              events.map((event) => (
                <div key={event.id} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-2xl border p-3">
                  <span className="font-semibold text-primary">{event.start_time.slice(0, 5)}</span>
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.type} • {event.location ?? "local não informado"}</p>
                  </div>
                  <Button size="sm" variant={event.status === "concluído" ? "secondary" : "outline"} onClick={() => updateEvent.mutate({ id: event.id, input: { status: event.status === "concluído" ? "agendado" : "concluído" } })}>
                    {event.status === "concluído" ? "Feito" : "Concluir"}
                  </Button>
                </div>
              ))
            ) : (
              <EmptyState text="Nenhum compromisso hoje. Use o botão + para cadastrar." />
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Prioridades de hoje</CardTitle>
              <CardDescription>Vencidas, alta prioridade e tarefas do dia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingTasks ? (
                <Skeleton className="h-28" />
              ) : priorities.length ? (
                priorities.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => updateTask.mutate({ id: task.id, input: { status: "concluída" } })}
                    className="flex w-full items-center justify-between rounded-2xl border p-3 text-left transition hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{task.title}</span>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{task.priority}</span>
                  </button>
                ))
              ) : (
                <EmptyState text="Sem prioridades pendentes." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta diária</CardTitle>
              <CardDescription>{dailyDone} de {dailyGoalTotal} ações concluídas</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={dailyProgress} />
              <p className="mt-3 text-3xl font-semibold">{dailyProgress}%</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <WeatherCard weather={weatherQuery.data} loading={weatherQuery.isLoading} />
        <Card>
          <CardHeader>
            <CardTitle>Meta do mês</CardTitle>
            <CardDescription>Sem dados inventados nesta etapa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <GoalLine label="Vendas" value={`0 / ${profile?.meta_vendas_mensal ?? 0}`} />
            <GoalLine label="VGV" value={`${formatCurrency(0)} / ${formatCurrency(profile?.meta_vgv_mensal)}`} />
            <GoalLine label="Comissão" value={`${formatCurrency(0)} / ${formatCurrency(profile?.meta_comissao_mensal)}`} />
          </CardContent>
        </Card>
        <Card className="bg-accent text-accent-foreground">
          <CardHeader>
            <CardTitle>{phrase}</CardTitle>
            <CardDescription className="text-accent-foreground/70">Frase local do dia. Sem IA nesta etapa.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={() => setSummaryOpen(true)}>
              Encerrar meu dia
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo do dia</DialogTitle>
            <DialogDescription>Revise o que ficou pronto e o que vai para amanhã.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SummaryPill label="Compromissos realizados" value={completedEvents.length} />
            <SummaryPill label="Compromissos pendentes" value={events.length - completedEvents.length} />
            <SummaryPill label="Tarefas concluídas" value={todayTasks.filter((task) => task.status === "concluída").length} />
            <SummaryPill label="Tarefas pendentes" value={todayTasks.filter((task) => task.status === "pendente").length} />
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-sm text-muted-foreground">Produtividade</p>
            <p className="text-3xl font-semibold">{dailyProgress}%</p>
          </div>
          <Textarea value={tomorrowNotes} onChange={(event) => setTomorrowNotes(event.target.value)} placeholder="O que ficou para amanhã?" />
          <Button onClick={finishDay}>Transferir pendências para amanhã</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, onClick }: { icon: React.ElementType; label: string; value: number | string; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className="rounded-3xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <Icon className="mb-4 h-5 w-5 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Comp>
  );
}

function WeatherMini({ weather, loading }: { weather?: Awaited<ReturnType<typeof getWeather>>; loading: boolean }) {
  if (loading) return <Skeleton className="h-20 w-full md:w-64" />;
  return (
    <div className="rounded-3xl bg-white/10 p-4 md:min-w-64">
      <div className="flex items-center gap-3">
        <CloudSun className="h-8 w-8" />
        <div>
          <p className="text-3xl font-semibold">{weather?.temperature !== null && weather?.temperature !== undefined ? `${weather.temperature}°C` : "--"}</p>
          <p className="text-sm opacity-75">{weather?.condition ?? "Clima não configurado"}</p>
        </div>
      </div>
      <p className="mt-3 text-sm opacity-80">{weather ? weatherMessage(weather) : "Configure a API para dados reais."}</p>
    </div>
  );
}

function WeatherCard({ weather, loading }: { weather?: Awaited<ReturnType<typeof getWeather>>; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clima</CardTitle>
        <CardDescription>{weather ? weatherMessage(weather) : "Integração preparada para API real."}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        {loading ? (
          <Skeleton className="col-span-2 h-24" />
        ) : (
          <>
            <GoalLine label="Temperatura" value={weather?.temperature !== null && weather?.temperature !== undefined ? `${weather.temperature}°C` : "--"} />
            <GoalLine label="Sensação" value={weather?.feelsLike !== null && weather?.feelsLike !== undefined ? `${weather.feelsLike}°C` : "--"} />
            <GoalLine label="Máx / Mín" value={weather?.max !== null && weather?.max !== undefined ? `${weather.max}° / ${weather?.min ?? "--"}°` : "--"} />
            <GoalLine label="Chuva" value={weather?.rainChance !== null && weather?.rainChance !== undefined ? `${weather.rainChance}%` : "--"} />
            <GoalLine label="Condição" value={weather?.condition ?? "--"} />
            <GoalLine label="Vento" value={weather?.wind !== null && weather?.wind !== undefined ? `${weather.wind} km/h` : "--"} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GoalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
