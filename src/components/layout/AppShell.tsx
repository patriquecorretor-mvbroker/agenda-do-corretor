import { useState } from "react";
import { Building2, CalendarDays, CirclePlus, Home, LayoutGrid, LogOut, Moon, Settings, Sun, Target, User, Users, WalletCards } from "lucide-react";
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
import { FinancePage } from "@/features/finance/FinancePage";
import { GoalsPage } from "@/features/goals/GoalsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import type { PaletteId } from "@/lib/appearance";
import type { AppView } from "@/types/ui";

const navItems: Array<{ view: AppView; label: string; icon: React.ElementType; mobile?: boolean }> = [
  { view: "day", label: "Meu Dia", icon: Home },
  { view: "agenda", label: "Agenda", icon: CalendarDays },
  { view: "clients", label: "Clientes", icon: Users },
  { view: "buildings", label: "Edifícios", icon: Building2 },
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
  const { signOut } = useAuth();
  const { toast } = useToast();
  const mobileItems = navItems.filter((item) => ["day", "agenda", "clients"].includes(item.view));
  const moreItems = navItems.filter((item) => ["buildings", "finance", "goals", "profile", "settings"].includes(item.view));
  const currentItem = navItems.find((item) => item.view === view) ?? navItems[0];
  const currentDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());

  async function handleSignOut() {
    await signOut();
    toast({ title: "Sessão encerrada." });
  }

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-background transition-colors duration-300">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/10 bg-[hsl(var(--sidebar))] p-4 text-white transition-colors duration-300 lg:flex lg:flex-col">
        <div className="mb-7 flex items-center gap-3 px-1 pt-1">
          <img
            src="/brand/mv-broker-logo.jpg"
            alt="MV Broker"
            className="h-11 w-11 rounded-xl border border-primary/30 object-cover shadow-[0_8px_24px_rgba(218,165,57,0.18)]"
          />
          <div>
            <p className="text-sm font-semibold">MV Broker</p>
            <p className="text-[0.68rem] text-white/45">Agenda do Corretor</p>
          </div>
        </div>
        <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase text-white/30">Workspace</p>
        <nav className="grid gap-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => setView(item.view)}
              className={cn(
                "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/55 transition hover:bg-white/[0.055] hover:text-white",
                view === item.view && "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
              )}
            >
              {view === item.view && <span className="absolute -left-1 h-5 w-0.5 rounded-full bg-primary" />}
              <item.icon className={cn("h-[18px] w-[18px]", view === item.view && "text-primary")} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto grid gap-2">
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

      <main className="min-h-screen w-full min-w-0 overflow-x-hidden px-3 pb-28 pt-3 sm:px-5 sm:pt-5 lg:ml-64 lg:w-auto lg:px-6 lg:pb-8 lg:pt-0 xl:px-8 2xl:px-10">
        <header className="sticky top-0 z-20 -mx-6 hidden h-16 items-center justify-between border-b bg-background/88 px-6 backdrop-blur-xl lg:flex xl:-mx-8 xl:px-8 2xl:-mx-10 2xl:px-10">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border bg-card text-primary shadow-sm"><currentItem.icon className="h-[18px] w-[18px]" /></span>
            <div><p className="text-sm font-semibold">{currentItem.label}</p><p className="text-[0.68rem] capitalize text-muted-foreground">{currentDate}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"} onClick={() => onDarkChange(!dark)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button onClick={() => setQuickAddOpen(true)}><CirclePlus className="h-4 w-4" /> Novo</Button>
          </div>
        </header>
        <div className="w-full min-w-0 lg:py-6">
          {view === "day" && <DashboardPage onNavigate={setView} dark={dark} onDarkChange={onDarkChange} />}
          {view === "agenda" && <AgendaPage />}
          {view === "clients" && <ClientsPage />}
          {view === "buildings" && <BuildingsPage />}
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
