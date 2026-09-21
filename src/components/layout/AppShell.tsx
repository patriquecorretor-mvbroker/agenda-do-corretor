import { useState } from "react";
import { CalendarDays, CirclePlus, Home, LogOut, Moon, Settings, Sun, Target, User, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";
import { QuickAddDialog } from "@/components/layout/QuickAddDialog";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AgendaPage } from "@/features/calendar/AgendaPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
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
  const { signOut } = useAuth();
  const { toast } = useToast();
  const mobileItems = navItems.filter((item) => item.mobile !== false && item.view !== "goals" && item.view !== "settings");

  async function handleSignOut() {
    await signOut();
    toast({ title: "Sessão encerrada." });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)))]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-primary/20 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_35%),linear-gradient(180deg,_#050403,_#0f0b08)] p-5 text-white backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-3">
          <img
            src="/brand/mv-broker-logo.jpg"
            alt="MV Broker"
            className="h-14 w-14 rounded-2xl border border-primary/35 object-cover shadow-[0_12px_36px_rgba(218,165,57,0.25)]"
          />
          <div>
            <p className="font-semibold">MV Broker</p>
            <p className="text-xs text-white/55">Agenda do Corretor</p>
          </div>
        </div>
        <nav className="grid gap-2">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => setView(item.view)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/62 transition hover:bg-white/10 hover:text-white",
                view === item.view && "bg-primary text-primary-foreground shadow-[0_18px_42px_rgba(218,165,57,0.28)] hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
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

      <main className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:px-8 lg:pb-8">
        {view === "day" && <DashboardPage onNavigate={setView} dark={dark} onDarkChange={onDarkChange} />}
        {view === "agenda" && <AgendaPage />}
        {view === "clients" && <ClientsPage />}
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
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/94 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
          {mobileItems.slice(0, 2).map((item) => (
            <MobileNavItem key={item.view} active={view === item.view} icon={item.icon} label={item.label} onClick={() => setView(item.view)} />
          ))}
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="-mt-8 grid h-16 w-16 place-items-center justify-self-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_44px_rgba(218,165,57,0.35)]"
            aria-label="Adicionar"
          >
            <CirclePlus className="h-7 w-7" />
          </button>
          {mobileItems.slice(2).map((item) => (
            <MobileNavItem key={item.view} active={view === item.view} icon={item.icon} label={item.label} onClick={() => setView(item.view)} />
          ))}
        </div>
      </nav>

      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-8 right-8 hidden rounded-full bg-primary p-5 text-primary-foreground shadow-[0_18px_44px_rgba(218,165,57,0.35)] transition hover:scale-105 lg:block"
        aria-label="Adicionar compromisso ou tarefa"
      >
        <CirclePlus className="h-7 w-7" />
      </button>

      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
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
      className={cn("grid min-h-[64px] place-items-center gap-1 rounded-2xl text-[0.72rem] font-medium text-muted-foreground", active && "text-primary")}
    >
      <Icon className={cn("h-5 w-5", active && "fill-primary/10")} />
      {label}
    </button>
  );
}
