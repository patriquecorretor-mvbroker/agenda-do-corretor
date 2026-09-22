import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, isBefore, isToday, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  Activity,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Cloud,
  CloudRain,
  CloudSun,
  Clock,
  Handshake,
  Home,
  ListChecks,
  Pause,
  Percent,
  PhoneCall,
  Play,
  RotateCcw,
  Moon,
  Sun,
  Target,
  TimerReset,
  TrendingUp,
  UserRoundCog,
  Users,
  WalletCards
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { clampPercent, cn, formatCurrency } from "@/lib/utils";
import { useEvents } from "@/features/calendar/use-events";
import { useTasks } from "@/features/tasks/use-tasks";
import { useProfile } from "@/features/profile/use-profile";
import { useFinance } from "@/features/finance/use-finance";
import { useClients } from "@/features/clients/use-clients";
import { getWeather, weatherMessage } from "@/features/dashboard/weather-service";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { AppView } from "@/types/ui";
import type { WeatherData } from "@/features/dashboard/weather-service";

const phrases = [
  "Consistência gera resultado.",
  "Quem acompanha bem, vende melhor.",
  "O próximo sim pode estar no próximo retorno.",
  "Agenda organizada, energia preservada.",
  "Pequenas ações diárias constroem grandes meses."
];

export function DashboardPage({
  onNavigate,
  dark,
  onDarkChange
}: {
  onNavigate: (view: AppView) => void;
  dark: boolean;
  onDarkChange: (dark: boolean) => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { profile } = useProfile();
  const { events, isLoading: loadingEvents, updateEvent } = useEvents(today);
  const { tasks, isLoading: loadingTasks, updateTask } = useTasks();
  const { clients } = useClients();
  const finance = useFinance();
  const { toast } = useToast();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [tomorrowNotes, setTomorrowNotes] = useState("");
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [performanceMonth, setPerformanceMonth] = useState(format(new Date(), "yyyy-MM"));
  const performanceDate = parseISO(`${performanceMonth}-01`);
  const { events: performanceEvents, isLoading: loadingPerformance } = useEvents({
    from: format(startOfMonth(subMonths(performanceDate, 5)), "yyyy-MM-dd"),
    to: format(endOfMonth(performanceDate), "yyyy-MM-dd")
  });
  const focusProgress = clampPercent(((25 * 60 - focusSeconds) / (25 * 60)) * 100);

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
  const commercialMetrics = useMemo(() => {
    const visitedProperties = events.filter((event) => event.type === "visita" && event.status === "concluído").length;
    const scheduledVisits = events.filter((event) => event.type === "visita" && event.status === "agendado").length;
    const convertedSales = finance.commissions.filter((commission) =>
      ["confirmada", "parcialmente recebida", "recebida"].includes(commission.status)
    ).length;
    const leadCount = clients.filter((client) => client.status === "lead").length;
    const contactedLeads = clients.filter((client) => ["em contato", "qualificado"].includes(client.status)).length;
    const propertyProfile = mostServedPropertyProfile(clients.map((client) => client.property_profile).filter(Boolean) as string[]);
    const conversionBase = leadCount || contactedLeads;
    const conversionRate = conversionBase ? clampPercent((convertedSales / conversionBase) * 100) : null;

    return {
      demoMode: !hasSupabaseConfig,
      visitedProperties,
      leadsReceived: leadCount,
      contactedLeads,
      scheduledVisits,
      convertedSales,
      conversionRate,
      propertyProfile: propertyProfile ?? "Dados insuficientes",
      clientPortfolio: clients.length
    };
  }, [clients, events, finance.commissions]);

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

  useEffect(() => {
    if (!focusRunning) return;
    const timer = window.setInterval(() => {
      setFocusSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setFocusRunning(false);
          toast({ title: "Foco concluído. Hora de respirar e registrar o próximo passo." });
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning, toast]);

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
  const weatherVisual = getWeatherVisual(weatherQuery.data);

  return (
    <div className="space-y-5">
      <section className={`relative overflow-hidden rounded-[2rem] p-5 text-white shadow-soft md:p-8 ${weatherVisual.background}`}>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(0,0,0,0.26),_rgba(0,0,0,0.05)_45%,_rgba(0,0,0,0.38))]" />
        <div className={`absolute ${weatherVisual.orbClass}`} />
        <div className="absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
                <weatherVisual.icon className="h-3.5 w-3.5" />
                {weatherVisual.label}
              </span>
              <div className="grid grid-cols-2 gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur">
                <button
                  type="button"
                  onClick={() => onDarkChange(false)}
                  className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${!dark ? "bg-white text-[#17120b]" : "text-white/70 hover:text-white"}`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => onDarkChange(true)}
                  className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${dark ? "bg-white text-[#17120b]" : "text-white/70 hover:text-white"}`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Escuro
                </button>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("profile")}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-black/15 px-2.5 pr-3 text-xs font-semibold text-white transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                aria-label="Abrir configurações do perfil"
              >
                {profile?.foto ? (
                  <img src={profile.foto} alt="" className="h-7 w-7 rounded-full border border-white/30 object-cover" />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                    <UserRoundCog className="h-4 w-4" />
                  </span>
                )}
                Meu perfil
              </button>
            </div>
            <p className="text-sm text-white/75">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-5xl">
              {greeting}, {profile?.nome?.split(" ")[0] ?? "corretor"}
            </h1>
            <p className="mt-3 text-sm text-white/80">
              {format(new Date(), "HH:mm")} • {profile?.cidade ?? "Cidade não informada"}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{weatherVisual.message}</p>
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

      <CommercialGrowthPanel
        month={performanceMonth}
        onMonthChange={setPerformanceMonth}
        events={performanceEvents}
        tasks={tasks}
        clients={clients}
        commissions={finance.commissions}
        loading={loadingPerformance || loadingTasks}
      />

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <ProductivityFocusCard
          visitedProperties={commercialMetrics.visitedProperties}
          scheduledVisits={commercialMetrics.scheduledVisits}
          dailyProgress={dailyProgress}
          seconds={focusSeconds}
          progress={focusProgress}
          running={focusRunning}
          onToggle={() => setFocusRunning((current) => !current)}
          onReset={() => {
            setFocusRunning(false);
            setFocusSeconds(25 * 60);
          }}
          onShortBreak={() => {
            setFocusRunning(false);
            setFocusSeconds(5 * 60);
          }}
        />
        <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.16),_transparent_36%),hsl(var(--card))]">
          <CardHeader>
            <CardTitle>Bloco de produtividade dos imóveis</CardTitle>
            <CardDescription>Uma leitura simples para manter captação, visitas e retorno no ritmo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <GoalLine label="Visitados" value={`${commercialMetrics.visitedProperties} imóveis`} />
            <GoalLine label="Visitas abertas" value={`${commercialMetrics.scheduledVisits} agendas`} />
            <GoalLine label="Ritmo do dia" value={`${dailyProgress}% concluído`} />
          </CardContent>
        </Card>
      </section>

      <button
        type="button"
        onClick={() => onNavigate("finance")}
        className="w-full overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[#050403] p-4 text-left text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(218,165,57,0.16)] md:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <WalletCards className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Central financeira</p>
              <p className="text-xs text-white/55">Resumo rápido para hoje e para os próximos 30 dias.</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-primary/30 px-3 py-1 text-xs text-primary sm:inline-flex">Abrir financeiro</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <FinanceMini label="Receber hoje" value={formatCurrency(finance.metrics.receiveToday)} />
          <FinanceMini label="Pagar hoje" value={formatCurrency(finance.metrics.payToday)} />
          <FinanceMini label="Comissão 30 dias" value={formatCurrency(finance.metrics.forecast.today + finance.metrics.forecast.next7 + finance.metrics.forecast.next30)} />
          <FinanceMini label="Despesa do mês" value={formatCurrency(finance.metrics.expensesMonth)} />
          <FinanceMini label="Resultado líquido" value={formatCurrency(finance.metrics.netResultMonth)} />
        </div>
      </button>

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

function getWeatherVisual(weather?: WeatherData) {
  const condition = weather?.condition?.toLowerCase() ?? "";
  const rain = weather?.rainChance ?? 0;
  const isRain = rain >= 50 || condition.includes("chuva") || condition.includes("rain") || condition.includes("storm");
  const isCloud = condition.includes("nublado") || condition.includes("cloud") || condition.includes("neblina") || condition.includes("overcast");
  const unavailable = !weather || weather.source === "unavailable";

  if (isRain) {
    return {
      icon: CloudRain,
      label: "Previsão de chuva",
      message: "Há possibilidade de chuva. Vale confirmar rotas, horários e visitas externas.",
      background: "bg-[radial-gradient(circle_at_18%_20%,_rgba(148,163,184,0.45),_transparent_30%),linear-gradient(135deg,_#0f172a,_#334155_48%,_#020617)]",
      orbClass: "right-[-4rem] top-[-5rem] h-64 w-64 rounded-full bg-sky-300/20 blur-3xl"
    };
  }

  if (isCloud || unavailable) {
    return {
      icon: Cloud,
      label: unavailable ? "Clima não configurado" : "Tempo nublado",
      message: unavailable ? "Integração preparada para exibir sol, chuva e condições reais assim que a API estiver configurada." : "Tempo mais fechado. Bom momento para organizar retornos, ligações e documentos.",
      background: "bg-[radial-gradient(circle_at_20%_18%,_rgba(255,255,255,0.24),_transparent_28%),linear-gradient(135deg,_#1f2937,_#64748b_52%,_#111827)]",
      orbClass: "right-[-5rem] top-[-5rem] h-72 w-72 rounded-full bg-white/18 blur-3xl"
    };
  }

  return {
    icon: CloudSun,
    label: "Boa condição externa",
    message: weather ? weatherMessage(weather) : "Boa condição para organizar visitas e compromissos externos.",
    background: "bg-[radial-gradient(circle_at_18%_15%,_rgba(255,214,102,0.55),_transparent_28%),linear-gradient(135deg,_#f59e0b,_#f97316_44%,_#0f172a)]",
    orbClass: "right-[-4rem] top-[-5rem] h-72 w-72 rounded-full bg-yellow-200/35 blur-3xl"
  };
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

type CommercialSnapshot = {
  attendances: number;
  visits: number;
  beachClients: number;
  proposals: number;
  closings: number;
  completedTasks: number;
  visitedProperties: number;
};

function CommercialGrowthPanel({
  month,
  onMonthChange,
  events,
  tasks,
  clients,
  commissions,
  loading
}: {
  month: string;
  onMonthChange: (month: string) => void;
  events: ReturnType<typeof useEvents>["events"];
  tasks: ReturnType<typeof useTasks>["tasks"];
  clients: ReturnType<typeof useClients>["clients"];
  commissions: ReturnType<typeof useFinance>["commissions"];
  loading: boolean;
}) {
  const selected = parseISO(`${month}-01`);
  const previousMonth = format(subMonths(selected, 1), "yyyy-MM");
  const current = buildCommercialSnapshot(month, events, tasks, clients, commissions);
  const previous = buildCommercialSnapshot(previousMonth, events, tasks, clients, commissions);
  const months = Array.from({ length: 6 }, (_, index) => subMonths(selected, 5 - index));
  const series = months.map((date) => ({
    key: format(date, "yyyy-MM"),
    label: format(date, "MMM", { locale: ptBR }).replace(".", ""),
    ...buildCommercialSnapshot(format(date, "yyyy-MM"), events, tasks, clients, commissions)
  }));
  const maxChart = Math.max(...series.flatMap((item) => [item.attendances, item.visits, item.closings]), 1);
  const selectedTasks = tasks.filter((task) => task.due_date?.startsWith(month));
  const completionRate = selectedTasks.length ? clampPercent((current.completedTasks / selectedTasks.length) * 100) : null;
  const insights = commercialInsights(current, completionRate);
  const cards = [
    { label: "Atendimentos", value: current.attendances, before: previous.attendances, icon: Activity },
    { label: "Visitas", value: current.visits, before: previous.visits, icon: CalendarCheck2 },
    { label: "Clientes na praia", value: current.beachClients, before: previous.beachClients, icon: Users },
    { label: "Propostas", value: current.proposals, before: previous.proposals, icon: Handshake },
    { label: "Fechamentos", value: current.closings, before: previous.closings, icon: Target },
    { label: "Tarefas concluídas", value: current.completedTasks, before: previous.completedTasks, icon: CheckCircle2 },
    { label: "Imóveis visitados", value: current.visitedProperties, before: previous.visitedProperties, icon: Building2 }
  ];

  return (
    <Card className="overflow-hidden border-border/70 shadow-[0_18px_55px_rgba(11,18,32,0.07)]">
      <CardHeader className="border-b bg-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
              Controle de crescimento
            </div>
            <CardTitle>Performance comercial</CardTitle>
            <CardDescription>Compare atividade, execução e conversão sem misturar períodos.</CardDescription>
          </div>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Mês analisado
            <input
              type="month"
              value={month}
              max={format(new Date(), "yyyy-MM")}
              onChange={(event) => onMonthChange(event.target.value)}
              className="h-11 min-w-44 rounded-2xl border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-3 sm:p-5">
        {loading ? <Skeleton className="h-56" /> : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {cards.map((card) => (
                <PerformanceMetric key={card.label} {...card} />
              ))}
              <div className="col-span-2 rounded-[1.4rem] bg-[#0B1220] p-4 text-white lg:col-span-1">
                <p className="text-xs text-white/55">Conclusão de tarefas</p>
                <p className="mt-2 text-2xl font-semibold">{completionRate === null ? "--" : `${completionRate}%`}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${completionRate ?? 0}%` }} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.5fr_0.7fr]">
              <div className="rounded-[1.4rem] border bg-muted/25 p-4">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Evolução em 6 meses</p>
                    <p className="text-xs text-muted-foreground">Atendimentos, visitas e fechamentos registrados.</p>
                  </div>
                  <div className="flex gap-3 text-[0.68rem] text-muted-foreground">
                    <ChartLegend tone="bg-primary" label="Atendimentos" />
                    <ChartLegend tone="bg-[#0F8A65]" label="Visitas" />
                    <ChartLegend tone="bg-[#B89A6A]" label="Fechamentos" />
                  </div>
                </div>
                <div className="grid h-44 grid-cols-6 items-end gap-2 sm:gap-4">
                  {series.map((item) => (
                    <div key={item.key} className="flex h-full min-w-0 flex-col justify-end gap-2">
                      <div className="flex h-32 items-end justify-center gap-1">
                        <ChartColumn value={item.attendances} max={maxChart} tone="bg-primary" />
                        <ChartColumn value={item.visits} max={maxChart} tone="bg-[#0F8A65]" />
                        <ChartColumn value={item.closings} max={maxChart} tone="bg-[#B89A6A]" />
                      </div>
                      <span className="truncate text-center text-[0.65rem] font-medium uppercase text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.4rem] bg-[#0B1220] p-4 text-white">
                <p className="text-sm font-semibold">Leitura do período</p>
                <div className="mt-4 space-y-3">
                  {insights.map((insight) => (
                    <div key={insight} className="flex gap-2 text-xs leading-5 text-white/70">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceMetric({ label, value, before, icon: Icon }: { label: string; value: number; before: number; icon: React.ElementType }) {
  const delta = before ? Math.round(((value - before) / before) * 100) : null;
  return (
    <div className="min-w-0 rounded-[1.4rem] border bg-card p-3.5 shadow-[0_8px_24px_rgba(11,18,32,0.04)] sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-foreground"><Icon className="h-4 w-4" /></span>
        <span className={cn("text-[0.68rem] font-semibold", delta === null ? "text-muted-foreground" : delta >= 0 ? "text-emerald-600" : "text-red-500")}>
          {delta === null ? "sem base" : `${delta >= 0 ? "+" : ""}${delta}%`}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChartLegend({ tone, label }: { tone: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", tone)} />{label}</span>;
}

function ChartColumn({ value, max, tone }: { value: number; max: number; tone: string }) {
  const height = value ? Math.max((value / max) * 100, 8) : 2;
  return <div title={String(value)} className={cn("w-2 rounded-t-sm transition-all sm:w-3", tone)} style={{ height: `${height}%` }} />;
}

function buildCommercialSnapshot(
  month: string,
  events: ReturnType<typeof useEvents>["events"],
  tasks: ReturnType<typeof useTasks>["tasks"],
  clients: ReturnType<typeof useClients>["clients"],
  commissions: ReturnType<typeof useFinance>["commissions"]
): CommercialSnapshot {
  const monthEvents = events.filter((event) => event.date.startsWith(month) && event.status !== "cancelado");
  const monthClients = clients.filter((client) => client.updated_at.startsWith(month));
  const commissionClosings = commissions.filter((commission) => commission.sale_date?.startsWith(month) && commission.status !== "cancelada").length;
  const clientClosings = clients.filter((client) => client.sale_date?.startsWith(month)).length;
  const coastalCities = ["santos", "guaruja", "guarujá", "praia grande", "sao vicente", "são vicente", "bertioga", "ubatuba", "caraguatatuba", "ilhabela", "navegantes", "itajai", "itajaí", "balneario camboriu", "balneário camboriú", "florianopolis", "florianópolis", "xangri-la", "xangri-lá", "capao da canoa", "capão da canoa", "torres"];
  const visits = monthEvents.filter((event) => event.type === "visita");
  return {
    attendances: monthEvents.filter((event) => ["visita", "reunião", "ligação", "follow-up"].includes(event.type)).length,
    visits: visits.length,
    beachClients: monthClients.filter((client) => coastalCities.some((city) => client.city?.toLocaleLowerCase("pt-BR").includes(city))).length,
    proposals: monthClients.filter((client) => ["proposta", "negociação"].includes(client.status)).length,
    closings: commissionClosings || clientClosings,
    completedTasks: tasks.filter((task) => task.due_date?.startsWith(month) && task.status === "concluída").length,
    visitedProperties: visits.filter((event) => event.status === "concluído").length
  };
}

function commercialInsights(metrics: CommercialSnapshot, completionRate: number | null) {
  const insights: string[] = [];
  if (!metrics.attendances && !metrics.proposals && !metrics.closings) return ["Ainda não há dados suficientes neste mês. Registre atendimentos, visitas e propostas para liberar o diagnóstico."];
  if (metrics.visits > 0 && metrics.proposals === 0) insights.push("Há visitas, mas nenhuma proposta registrada. Revise o retorno após a visita e a aderência dos imóveis apresentados.");
  if (metrics.proposals > 0 && metrics.closings === 0) insights.push("As propostas ainda não viraram fechamento. Acompanhe objeções, prazo de resposta e condição comercial.");
  if (completionRate !== null && completionRate < 60) insights.push(`A execução das tarefas está em ${completionRate}%. Reduzir pendências pode melhorar a velocidade dos follow-ups.`);
  if (metrics.closings > 0) insights.push(`${metrics.closings} fechamento(s) no período. Compare a origem e a cidade desses clientes para repetir o canal mais eficiente.`);
  if (!insights.length) insights.push("O período está equilibrado. Continue registrando cada etapa para tornar o comparativo mais preciso.");
  return insights.slice(0, 3);
}

function CommercialCard({
  icon: Icon,
  label,
  value,
  helper,
  wide
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  helper: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "rounded-3xl border bg-card p-4 shadow-sm sm:col-span-2 xl:col-span-1" : "rounded-3xl border bg-card p-4 shadow-sm"}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/12 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function ProductivityFocusCard({
  visitedProperties,
  scheduledVisits,
  dailyProgress,
  seconds,
  progress,
  running,
  onToggle,
  onReset,
  onShortBreak
}: {
  visitedProperties: number;
  scheduledVisits: number;
  dailyProgress: number;
  seconds: number;
  progress: number;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  onShortBreak: () => void;
}) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return (
    <Card className="overflow-hidden border-primary/25 bg-[#050403] text-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Foco total</CardTitle>
            <CardDescription className="text-white/65">Pomodoro divertido para ligar, prospectar e fechar pendências.</CardDescription>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <TimerReset className="h-6 w-6" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">{running ? "foco ligado" : "pronto para começar"}</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums">{minutes}:{rest}</p>
          <Progress value={progress} className="mt-4 bg-white/10" />
          <p className="mt-3 text-sm text-white/62">
            {running ? "Modo avião mental: uma missão por vez." : "Escolha uma tarefa, respire e aperte iniciar."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" onClick={onToggle}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Pausar" : "Iniciar"}
          </Button>
          <Button type="button" variant="outline" onClick={onShortBreak}>
            5 min
          </Button>
          <Button type="button" variant="ghost" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <FocusMini label="Visitados" value={visitedProperties} />
          <FocusMini label="Agendas" value={scheduledVisits} />
          <FocusMini label="Dia" value={`${dailyProgress}%`} />
        </div>
      </CardContent>
    </Card>
  );
}

function FocusMini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function mostServedPropertyProfile(properties: string[]) {
  if (!properties.length) return null;
  const profiles = properties.map((property) => {
    const lower = property.toLowerCase();
    if (lower.includes("apart")) return "Apartamento";
    if (lower.includes("casa")) return "Casa";
    if (lower.includes("terreno")) return "Terreno";
    if (lower.includes("studio")) return "Studio";
    if (lower.includes("cobertura")) return "Cobertura";
    return property;
  });
  const counts = profiles.reduce<Record<string, number>>((acc, profile) => {
    acc[profile] = (acc[profile] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
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

function FinanceMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
