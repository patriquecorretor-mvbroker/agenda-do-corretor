import { useEffect, useMemo, useState } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore, isSameDay, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  Activity,
  BarChart3,
  CalendarDays,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudRain,
  CloudSun,
  Clock,
  Handshake,
  Home,
  ListChecks,
  MapPin,
  Pause,
  Percent,
  PhoneCall,
  Plus,
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
import { getUpcomingSpecialDate } from "@/features/calendar/special-dates";

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
  const upcomingSpecial = getUpcomingSpecialDate(new Date());
  const weekDays = eachDayOfInterval({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) });

  return (
    <div className="space-y-5">
      <section className="relative min-h-[250px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#07101b] text-white shadow-[0_24px_70px_rgba(2,8,18,.24)] md:min-h-[270px]">
        <img src="/brand/capao-sunset.png" alt="Orla ao pôr do sol" className="absolute inset-0 h-full w-full object-cover object-[62%_center]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,9,16,.96)_0%,rgba(3,9,16,.72)_42%,rgba(3,9,16,.12)_76%,rgba(3,9,16,.52)_100%)]" />
        <div className="relative flex min-h-[250px] flex-col justify-between gap-6 p-5 md:min-h-[270px] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[#f1cf79]">{profile?.cidade ?? "Litoral"}</p>
              <h1 className="mt-4 text-3xl font-semibold md:text-[2.35rem]">{greeting}, {profile?.nome?.split(" ")[0] ?? "corretor"}!</h1>
              <p className="mt-2 text-sm text-white/68 md:text-base">Planejamento hoje, grandes conquistas amanhã.</p>
            </div>
            <p className="hidden max-w-[190px] text-right text-xs font-semibold uppercase leading-5 text-white/85 md:block">Mais que negócios,<br /><span className="text-[#f1cf79]">qualidade de vida.</span></p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onDarkChange(false)} className={cn("grid h-9 w-9 place-items-center rounded-lg border border-white/15", !dark ? "bg-white text-[#111827]" : "bg-black/25 text-white/70")} aria-label="Modo claro"><Sun className="h-4 w-4" /></button>
              <button type="button" onClick={() => onDarkChange(true)} className={cn("grid h-9 w-9 place-items-center rounded-lg border border-white/15", dark ? "bg-white text-[#111827]" : "bg-black/25 text-white/70")} aria-label="Modo escuro"><Moon className="h-4 w-4" /></button>
              <button type="button" onClick={() => onNavigate("profile")} className="ml-1 inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 text-xs font-semibold text-white/78 backdrop-blur"><UserRoundCog className="h-3.5 w-3.5" />Perfil</button>
            </div>
            <div className="flex w-full max-w-xl items-center justify-between gap-4 rounded-xl border border-white/15 bg-[#07101b]/78 px-4 py-3 backdrop-blur-md sm:w-auto sm:min-w-[420px]">
              <div className="flex items-center gap-3"><weatherVisual.icon className="h-7 w-7 text-[#f1cf79]" /><div><p className="text-sm font-semibold">{weatherQuery.data?.temperature !== null && weatherQuery.data?.temperature !== undefined ? `${weatherQuery.data.temperature}°` : "--°"} <span className="ml-1 text-xs font-normal text-white/65">{weatherQuery.data?.condition ?? weatherVisual.label}</span></p><p className="text-[0.68rem] text-white/55">{profile?.cidade ?? "Cidade não informada"}</p></div></div>
              <div className="h-9 w-px bg-white/15" />
              <div className="text-right"><p className="text-xs font-semibold capitalize">{format(new Date(), "EEE, dd 'de' MMMM", { locale: ptBR })}</p><p className="mt-1 text-[0.68rem] text-white/55">Semana {format(new Date(), "II")} • {format(new Date(), "yyyy")}</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <PremiumMetricCard icon={CalendarCheck2} label="Compromissos" value={events.length} helper="hoje" tone="blue" onClick={() => onNavigate("agenda")} />
            <PremiumMetricCard icon={CheckCircle2} label="Concluídos" value={completedEvents.length} helper="já resolvidos" tone="green" onClick={() => onNavigate("agenda")} />
            <PremiumMetricCard icon={Clock} label="Pendentes" value={pendingTasks.length} helper="ainda em aberto" tone="gold" onClick={() => onNavigate("agenda")} />
            <PremiumMetricCard icon={Target} label="Atrasados" value={overdueEvents.length} helper="pedem atenção" tone="red" onClick={() => onNavigate("agenda")} />
          </section>

          <Card className="overflow-hidden rounded-[1.4rem] border-black/5 shadow-[0_18px_60px_rgba(2,8,18,.08)] dark:border-white/10">
            <CardHeader className="border-b p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></span><div><CardTitle className="text-lg">Agenda</CardTitle><CardDescription className="capitalize">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</CardDescription></div></div><div className="flex items-center gap-1"><Button size="icon" variant="outline" onClick={() => onNavigate("agenda")}><ChevronLeft className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => onNavigate("agenda")}>Hoje</Button><Button size="icon" variant="outline" onClick={() => onNavigate("agenda")}><ChevronRight className="h-4 w-4" /></Button><Button className="ml-1 hidden sm:inline-flex" onClick={() => onNavigate("agenda")}><Plus className="h-4 w-4" />Novo</Button></div></div>
              <div className="mt-4 grid grid-cols-4 rounded-xl border bg-muted/40 p-1 text-xs font-semibold text-muted-foreground"><button type="button" onClick={() => onNavigate("agenda")} className="min-h-9 rounded-lg bg-primary text-primary-foreground shadow-sm">Dia</button><button type="button" onClick={() => onNavigate("agenda")} className="rounded-lg">Semana</button><button type="button" onClick={() => onNavigate("agenda")} className="rounded-lg">Mês</button><button type="button" onClick={() => onNavigate("agenda")} className="rounded-lg">Lista</button></div>
              <div className="mt-3 grid grid-cols-7 gap-1 rounded-xl border p-1.5">{weekDays.map((day) => <button key={day.toISOString()} type="button" onClick={() => onNavigate("agenda")} className={cn("grid min-h-12 place-items-center rounded-lg text-center transition hover:bg-muted", isSameDay(day, new Date()) && "bg-[linear-gradient(135deg,#f7dfa1,#e7b94d)] text-[#17120b] shadow-[0_8px_24px_rgba(218,165,57,.24)]")}><span className="text-[0.58rem] font-semibold uppercase">{format(day, "EEE", { locale: ptBR }).slice(0, 3)}</span><span className="text-sm font-semibold">{format(day, "dd")}</span></button>)}</div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {upcomingSpecial && <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 text-primary" /><div><p className="text-[0.65rem] font-semibold uppercase text-primary">Próxima data • {format(upcomingSpecial.date, "dd/MM")}</p><p className="mt-1 font-semibold">{upcomingSpecial.special.title}</p><p className="mt-1 text-xs text-muted-foreground">{upcomingSpecial.special.message}</p></div></div><Button size="sm" variant="outline" onClick={() => onNavigate("agenda")}>Criar arte</Button></div>}
              <div className="mb-3 flex items-end justify-between"><div><h2 className="font-semibold">Linha do tempo</h2><p className="text-xs text-muted-foreground">Conclua ou abra a agenda para editar os detalhes.</p></div><button type="button" onClick={() => onNavigate("agenda")} className="text-xs font-semibold text-primary">Ver dia completo</button></div>
              {loadingEvents ? <Skeleton className="h-28" /> : events.length ? <div className="divide-y rounded-xl border">{events.slice(0, 3).map((event) => <div key={event.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 p-3 sm:grid-cols-[68px_1fr_auto]"><span className="text-sm font-semibold">{event.start_time.slice(0,5)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold capitalize">{event.title}</p><p className="mt-1 flex items-center gap-1 truncate text-[0.68rem] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{event.location ?? "Local não informado"}</p></div><Button size="sm" variant={event.status === "concluído" ? "secondary" : "outline"} onClick={() => updateEvent.mutate({ id: event.id, input: { status: event.status === "concluído" ? "agendado" : "concluído" } })}>{event.status === "concluído" ? "Feito" : "Concluir"}</Button></div>)}</div> : <EmptyState text="Nenhum compromisso hoje. Use o botão + para cadastrar." />}
            </CardContent>
          </Card>
        </div>

        <aside className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
          <Card className="rounded-[1.4rem]"><CardHeader><CardTitle>Foco agora</CardTitle><CardDescription>Vencidas, alta prioridade e tarefas de hoje.</CardDescription></CardHeader><CardContent className="space-y-2">{priorities.length ? priorities.slice(0,4).map((task) => <button key={task.id} type="button" onClick={() => updateTask.mutate({ id: task.id, input: { status: "concluída" } })} className="flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left text-xs transition hover:border-primary/40"><span className="truncate font-medium">{task.title}</span><span className="shrink-0 text-muted-foreground">{task.due_time?.slice(0,5) ?? "Hoje"}</span></button>) : <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">Nenhuma prioridade crítica agora.</div>}<Button variant="ghost" className="mt-1 w-full justify-between" onClick={() => onNavigate("agenda")}>Ver todas as tarefas <ChevronRight className="h-4 w-4" /></Button></CardContent></Card>
          <Card className="rounded-[1.4rem]"><CardHeader><CardTitle>Tarefas do dia</CardTitle><CardDescription>Lista compacta para operar rápido.</CardDescription></CardHeader><CardContent className="space-y-2">{todayTasks.slice(0,4).map((task) => <button key={task.id} type="button" onClick={() => updateTask.mutate({ id: task.id, input: { status: task.status === "concluída" ? "pendente" : "concluída" } })} className="flex w-full items-center gap-2 py-1.5 text-left"><span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", task.status === "concluída" && "border-primary bg-primary text-primary-foreground")}><CheckCircle2 className="h-3 w-3" /></span><span className="min-w-0 flex-1 truncate text-xs">{task.title}</span><span className="text-[0.65rem] text-muted-foreground">{task.due_time?.slice(0,5)}</span></button>)}{!todayTasks.length && <p className="text-sm text-muted-foreground">Nenhuma tarefa para hoje.</p>}</CardContent></Card>
          <div className="relative min-h-40 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#08111d] p-5 text-white shadow-[0_18px_50px_rgba(2,8,18,.18)] sm:col-span-2 2xl:col-span-1"><img src="/brand/capao-sunset.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,9,16,.94),rgba(3,9,16,.35))]" /><div className="relative"><p className="text-4xl leading-none text-primary">“</p><p className="mt-1 max-w-[220px] text-lg font-medium leading-7">{phrase}</p><span className="mt-4 block h-0.5 w-8 bg-primary" /></div></div>
        </aside>
      </div>

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

function PremiumMetricCard({ icon: Icon, label, value, helper, tone, onClick }: { icon: React.ElementType; label: string; value: number | string; helper: string; tone: "blue" | "green" | "gold" | "red"; onClick: () => void }) {
  const tones = {
    blue: "border-sky-400/20 bg-sky-400/10 text-sky-500",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-500",
    gold: "border-amber-400/20 bg-amber-400/10 text-amber-500",
    red: "border-red-400/20 bg-red-400/10 text-red-500"
  };
  return <button type="button" onClick={onClick} className="group flex min-h-[104px] items-center gap-3 rounded-[1.15rem] border bg-card p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_36px_rgba(2,8,18,.10)] sm:p-4">
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", tones[tone])}><Icon className="h-5 w-5" /></span>
    <span className="min-w-0"><span className="block text-2xl font-semibold leading-none tabular-nums">{value}</span><span className="mt-1.5 block truncate text-xs font-medium">{label}</span><span className="mt-0.5 block truncate text-[0.65rem] text-muted-foreground">{helper}</span></span>
  </button>;
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
