import { useState } from "react";
import { Bell, Building2, CalendarDays, ChevronDown, CirclePlus, Home, Images, LandPlot, LayoutGrid, LogOut, Moon, Newspaper, Search, Settings, Sun, Target, TimerReset, User, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";
import { QuickAddDialog } from "@/components/layout/QuickAddDialog";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AgendaPage } from "@/features/calendar/AgendaPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { BuildingsPage } from "@/features/buildings/BuildingsPage";
import { CondominiumsPage } from "@/features/condominiums/CondominiumsPage";
import { CityMediaPage } from "@/features/city-media/CityMediaPage";
import { MarketNewsPage } from "@/features/news/MarketNewsPage";
import { FinancePage } from "@/features/finance/FinancePage";
import { GoalsPage } from "@/features/goals/GoalsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { FocusPage } from "@/features/focus/FocusPage";
import { useProfile } from "@/features/profile/use-profile";
import type { PaletteId } from "@/lib/appearance";
import type { AppView } from "@/types/ui";

const navItems: Array<{ view: AppView; label: string; icon: React.ElementType; mobile?: boolean }> = [
  { view: "day", label: "Meu Dia", icon: Home },
  { view: "agenda", label: "Agenda", icon: CalendarDays },
  { view: "clients", label: "Clientes", icon: Users },
  { view: "focus", label: "Foco", icon: TimerReset },
  { view: "buildings", label: "Edifícios", icon: Building2 },
  { view: "condominiums", label: "Condomínios", icon: LandPlot },
  { view: "city-media", label: "Mídia da Cidade", icon: Images },
  { view: "news", label: "Mercado", icon: Newspaper },
  { view: "finance", label: "Financeiro", icon: WalletCards },
  { view: "goals", label: "Metas", icon: Target },
  { view: "profile", label: "Perfil", icon: User, mobile: false },
  { view: "settings", label: "Configurações", icon: Settings }
];

export function AppShell({
  dark,
  onDarkChange,
  palette,
  onPaletteChange,
  customColor,
  onCustomColorChange
}: {
  dark: boolean;
  onDarkChange: (dark: boolean) => void;
  palette: PaletteId;
  onPaletteChange: (palette: PaletteId) => void;
  customColor: string;
  onCustomColorChange: (color: string) => void;
}) {
  const [view, setView] = useState<AppView>("day");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const mobileItems = navItems.filter((item) => ["day", "agenda", "clients"].includes(item.view));
  const moreItems = navItems.filter((item) => ["focus", "buildings", "condominiums", "city-media", "news", "finance", "goals", "profile", "settings"].includes(item.view));

  async function handleSignOut() {
    await signOut();
    toast({ title: "Sessão encerrada." });
  }

  function handleGlobalSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = globalSearch.toLocaleLowerCase("pt-BR").trim();
    if (!term) return;
    if (/cliente|lead|contato/.test(term)) setView("clients");
    else if (/condom[ií]nio|lote|resort/.test(term)) setView("condominiums");
    else if (/edif|im[oó]vel|empreendimento|apartamento/.test(term)) setView("buildings");
    else if (/foto|v[ií]deo|m[ií]dia|cidade|praia/.test(term)) setView("city-media");
    else if (/foco|pomodoro|produtividade/.test(term)) setView("focus");
    else if (/agenda|compromisso|visita|reuni[aã]o|tarefa/.test(term)) setView("agenda");
    else if (/not[ií]cia|mercado|cr[eé]dito|investimento/.test(term)) setView("news");
    else if (/finance|receita|despesa|comiss[aã]o/.test(term)) setView("finance");
    else if (/meta|objetivo/.test(term)) setView("goals");
    else {
      toast({ title: "Busque por cliente, edifício, condomínio, mídia, agenda, financeiro ou metas." });
      return;
    }
    setGlobalSearch("");
  }

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-background transition-colors duration-300">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] overflow-hidden border-r border-white/10 bg-[hsl(var(--sidebar))] p-4 text-white transition-colors duration-300 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(180deg,transparent,rgba(3,8,16,.2)),url('/brand/capao-sunset.png')] bg-cover bg-[66%_center] opacity-20" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,hsl(var(--sidebar))_96%)]" />
        <div className="relative mb-7 flex items-center gap-3 px-1 pt-1">
          <img
            src="/brand/mv-broker-logo.jpg"
            alt="MV Broker"
            className="h-14 w-14 rounded-2xl border border-primary/40 object-cover shadow-[0_8px_28px_rgba(218,165,57,0.25)]"
          />
          <div>
            <p className="text-base font-semibold">MV Broker</p>
            <p className="text-xs text-white/45">Agenda do Corretor</p>
          </div>
        </div>
        <nav className="relative grid gap-1.5">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => setView(item.view)}
              className={cn(
                "relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/62 transition hover:bg-white/[0.055] hover:text-white",
                view === item.view && "border border-primary/40 bg-[linear-gradient(90deg,hsl(var(--primary)/0.22),rgba(255,255,255,.045))] text-white shadow-[0_0_28px_hsl(var(--primary)/0.16),inset_3px_0_0_hsl(var(--primary))]"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", view === item.view && "text-primary")} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="relative mt-auto grid gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-black/45 p-4 shadow-[0_16px_44px_rgba(0,0,0,.24)] backdrop-blur-sm">
            <div className="absolute inset-0 bg-[url('/brand/capao-sunset.png')] bg-cover bg-center opacity-25" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(4,9,16,.45),rgba(4,9,16,.95))]" />
            <div className="relative"><p className="text-[0.68rem] font-semibold uppercase text-primary">Disciplina gera liberdade</p><span className="mt-3 block h-0.5 w-7 bg-primary" /><p className="mt-3 text-xs leading-5 text-white/65">Grandes resultados são construídos com pequenas ações diárias.</p></div>
          </div>
          <Button variant="outline" onClick={() => onDarkChange(!dark)}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Modo claro" : "Modo escuro"}
          </Button>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="min-h-screen w-full min-w-0 overflow-x-hidden px-3 pb-28 pt-3 sm:px-5 sm:pt-5 lg:ml-[248px] lg:w-auto lg:px-5 lg:pb-8 lg:pt-0 xl:px-7 2xl:px-8">
        <header className="sticky top-0 z-20 -mx-5 hidden h-[76px] items-center justify-between border-b bg-background/86 px-5 backdrop-blur-xl lg:flex xl:-mx-7 xl:px-7 2xl:-mx-8 2xl:px-8">
          <form onSubmit={handleGlobalSearch} className="relative w-full max-w-[560px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} className="h-11 w-full rounded-xl border bg-card/70 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10" placeholder="Buscar clientes, imóveis, compromissos..." aria-label="Busca global" />
          </form>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Notificações" onClick={() => toast({ title: "Nenhuma nova notificação." })} className="relative">
              <Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </Button>
            <button type="button" onClick={() => setView("profile")} className="flex min-w-[190px] items-center gap-3 rounded-xl border bg-card/70 p-1.5 pr-3 text-left transition hover:border-primary/35">
              {profile?.foto ? <img src={profile.foto} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">{(profile?.nome ?? "C").split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{profile?.nome ?? "Corretor"}</span><span className="block text-[0.66rem] text-muted-foreground">Corretor de imóveis</span></span><ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </header>
        <div className="w-full min-w-0 lg:py-6">
          {view === "day" && <DashboardPage onNavigate={setView} dark={dark} onDarkChange={onDarkChange} />}
          {view === "agenda" && <AgendaPage />}
          {view === "clients" && <ClientsPage />}
          {view === "focus" && <FocusPage onNavigate={setView} />}
          {view === "buildings" && <BuildingsPage />}
          {view === "condominiums" && <CondominiumsPage />}
          {view === "city-media" && <CityMediaPage />}
          {view === "news" && <MarketNewsPage />}
          {view === "finance" && <FinancePage />}
          {view === "goals" && <GoalsPage />}
          {view === "profile" && (
            <ProfilePage
              dark={dark}
              onDarkChange={onDarkChange}
              palette={palette}
              onPaletteChange={onPaletteChange}
              customColor={customColor}
              onCustomColorChange={onCustomColorChange}
            />
          )}
          {view === "settings" && (
            <SettingsPage
              dark={dark}
              onDarkChange={onDarkChange}
              palette={palette}
              onPaletteChange={onPaletteChange}
              customColor={customColor}
              onCustomColorChange={onCustomColorChange}
            />
          )}
        </div>
      </main>

      <nav className="fixed bottom-2 left-2 right-2 z-40 rounded-[1.4rem] border bg-background/94 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_14px_40px_rgba(11,18,32,0.18)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-0.5">
          {mobileItems.slice(0, 2).map((item) => (
            <MobileNavItem key={item.view} active={view === item.view} icon={item.icon} label={item.label} onClick={() => setView(item.view)} />
          ))}
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="-mt-7 grid h-14 w-14 place-items-center justify-self-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_12px_32px_rgba(0,0,0,0.24)]"
            aria-label="Adicionar"
          >
            <CirclePlus className="h-6 w-6" />
          </button>
          {mobileItems.slice(2).map((item) => (
            <MobileNavItem key={item.view} active={view === item.view} icon={item.icon} label={item.label} onClick={() => setView(item.view)} />
          ))}
          <MobileNavItem active={moreItems.some((item) => item.view === view)} icon={LayoutGrid} label="Mais" onClick={() => setMoreOpen(true)} />
        </div>
      </nav>

      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mais áreas</DialogTitle><DialogDescription>Acesse os demais módulos e configurações.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {moreItems.map((item) => <button key={item.view} type="button" onClick={() => { setView(item.view); setMoreOpen(false); }} className={cn("flex min-h-24 flex-col items-start justify-between rounded-2xl border bg-card p-4 text-left transition hover:border-primary/45 hover:bg-primary/5", view === item.view && "border-primary bg-primary/10")}>
              <item.icon className="h-6 w-6 text-primary" /><span className="font-semibold">{item.label}</span>
            </button>)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MobileNavItem({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("grid min-h-[58px] place-items-center gap-0.5 rounded-xl px-1 text-[0.65rem] font-medium text-muted-foreground transition", active && "bg-primary/8 text-primary")}
    >
      <Icon className={cn("h-[18px] w-[18px]", active && "fill-primary/10")} />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}
