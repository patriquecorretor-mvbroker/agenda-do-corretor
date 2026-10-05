import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { CreditCard, Loader2, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { AuthPage } from "@/features/auth/AuthPage";
import { useProfile } from "@/features/profile/use-profile";
import { OnboardingPage } from "@/features/profile/OnboardingPage";
import { AppShell } from "@/components/layout/AppShell";
import { getPalette, hexToHsl, primaryForegroundFor, type PaletteId } from "@/lib/appearance";
import { PublicCityPage } from "@/features/city-media/PublicCityPage";
import { readSharedCityPage } from "@/features/city-media/city-pages";
import { useSubscriptionAccess } from "@/features/admin/use-saas-admin";
import { hasSubscriptionAccess } from "@/features/admin/subscription-access";
import { BillingPage } from "@/features/billing/BillingPage";

function AppContent() {
  const { user, loading, recoveringPassword, signOut } = useAuth();
  const { profile, isLoading } = useProfile();
  const access = useSubscriptionAccess();
  const [dark, setDark] = useState(() => safeStorageGet("theme") !== "light");
  const [palette, setPalette] = useState<PaletteId>(() => normalizePalette(safeStorageGet("palette")));
  const [customColor, setCustomColor] = useState(() => safeStorageGet("custom-color") ?? "#f47c20");
  const [billingOpen, setBillingOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    safeStorageSet("theme", dark ? "dark" : "light");
    safeStorageSet("palette", palette);
    safeStorageSet("custom-color", customColor);

    const selected = getPalette(palette);
    const tokens = dark ? selected.dark : selected.light;
    const customPrimary = palette === "custom" ? hexToHsl(customColor) : null;
    const resolved = customPrimary ? { ...tokens, primary: customPrimary, ring: customPrimary } : tokens;
    const root = document.documentElement;
    root.dataset.palette = palette;
    Object.entries(resolved).forEach(([key, value]) => root.style.setProperty(`--${toKebabCase(key)}`, value));
    if (customPrimary) root.style.setProperty("--primary-foreground", primaryForegroundFor(customPrimary));
    root.style.setProperty("--theme-gradient", selected.gradient);
  }, [customColor, dark, palette]);

  const sharedCityPage = readSharedCityPage();
  if (sharedCityPage) return <PublicCityPage page={sharedCityPage} />;

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!user || recoveringPassword) return <AuthPage />;

  if (isLoading || access.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (access.error || !hasSubscriptionAccess(access.data)) {
    if (billingOpen) return <main className="min-h-screen bg-background px-3 py-5 sm:px-6"><BillingPage onBack={() => setBillingOpen(false)} /></main>;
    const status = access.data?.status;
    const detail = access.error
      ? "Não foi possível confirmar sua assinatura. Verifique a conexão e tente novamente."
      : status === "past_due"
        ? "Existe uma mensalidade pendente. Regularize o pagamento para recuperar o acesso sem perder seus dados."
        : status === "trialing"
          ? "Seu período de teste terminou. Escolha um plano para continuar usando a agenda."
          : status === "suspended"
            ? "Sua conta está suspensa. Entre em contato com a MV Broker para regularizar o acesso."
            : status === "canceled"
              ? "Sua assinatura foi cancelada. Escolha um plano para voltar a usar a agenda."
              : "Sua conta ainda não possui um plano ativo. Entre em contato para liberar o acesso.";
    return <main className="grid min-h-screen place-items-center bg-[#05070a] px-5 text-white"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0e13] p-7 text-center shadow-2xl"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary"><CreditCard className="h-6 w-6" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Assinatura</p><h1 className="mt-2 text-2xl font-semibold">Acesso temporariamente indisponível</h1><p className="mt-3 text-sm leading-6 text-white/50">{detail}</p>{access.error && <Button className="mt-6 w-full" onClick={() => void access.refetch()}><RefreshCw className="h-4 w-4" />Tentar novamente</Button>} {!access.error && <Button className="mt-6 w-full" onClick={() => setBillingOpen(true)}>Ver planos e regularizar</Button>}<Button variant="ghost" className="mt-2 w-full text-white/60 hover:bg-white/5 hover:text-white" onClick={() => void signOut()}><LogOut className="h-4 w-4" />Sair</Button></section></main>;
  }

  const onboardingComplete = Boolean(
    profile?.nome &&
      profile.creci &&
      profile.cidade &&
      profile.horario_inicio &&
      profile.horario_fim &&
      profile.meta_comissao_mensal !== null
  );

  if (!onboardingComplete) return <OnboardingPage />;

  return (
    <AppShell
      dark={dark}
      onDarkChange={setDark}
      palette={palette}
      onPaletteChange={setPalette}
      customColor={customColor}
      onCustomColorChange={setCustomColor}
    />
  );
}

function normalizePalette(value: string | null): PaletteId {
  const valid: PaletteId[] = ["black-signature", "tech-graphite", "coast-pastel", "minimal-ink", "custom"];
  if (value && valid.includes(value as PaletteId)) return value as PaletteId;
  if (value === "mv-gold" || value === "premium-amber") return "black-signature";
  if (value === "broker-orange") return "tech-graphite";
  return "black-signature";
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function App() {
  return (
    <AppErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}

function safeStorageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // O aplicativo continua funcional mesmo quando o navegador bloqueia armazenamento local.
  }
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha ao iniciar a aplicação", error, info);
  }

  async recover() {
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations();
      await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
      const keys = await caches?.keys();
      await Promise.all((keys ?? []).map((key) => caches.delete(key)));
    } finally {
      window.location.reload();
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <section className="w-full max-w-md rounded-3xl border bg-card p-6 text-center shadow-soft">
          <img src="/icons/app-icon-master.png" alt="Agenda do Corretor" className="mx-auto h-16 w-16 rounded-2xl object-cover" />
          <h1 className="mt-5 text-2xl font-semibold">Vamos atualizar o aplicativo</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Uma versão antiga ficou salva neste dispositivo. Atualize para carregar a versão mais recente.
          </p>
          <Button className="mt-5 w-full" onClick={() => this.recover()}>
            <RefreshCw className="h-4 w-4" />
            Atualizar aplicativo
          </Button>
        </section>
      </main>
    );
  }
}
