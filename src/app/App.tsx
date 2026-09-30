import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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

function AppContent() {
  const { user, loading } = useAuth();
  const { profile, isLoading } = useProfile();
  const [dark, setDark] = useState(() => safeStorageGet("theme") !== "light");
  const [palette, setPalette] = useState<PaletteId>(() => normalizePalette(safeStorageGet("palette")));
  const [customColor, setCustomColor] = useState(() => safeStorageGet("custom-color") ?? "#f47c20");

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

  if (!user) return <AuthPage />;

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  const onboardingComplete = Boolean(
    profile?.nome &&
      profile.creci &&
      profile.cidade &&
      profile.horario_inicio &&
      profile.horario_fim &&
      profile.meta_vendas_mensal !== null &&
      profile.meta_vgv_mensal !== null &&
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
          <img src="/brand/mv-broker-logo.jpg" alt="MV Broker" className="mx-auto h-16 w-16 rounded-2xl object-cover" />
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
