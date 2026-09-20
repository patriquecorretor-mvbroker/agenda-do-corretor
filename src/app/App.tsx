import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { AuthPage } from "@/features/auth/AuthPage";
import { useProfile } from "@/features/profile/use-profile";
import { OnboardingPage } from "@/features/profile/OnboardingPage";
import { AppShell } from "@/components/layout/AppShell";
import { getPalette, hexToHsl, primaryForegroundFor, type PaletteId } from "@/lib/appearance";

function AppContent() {
  const { user, loading } = useAuth();
  const { profile, isLoading } = useProfile();
  const [dark, setDark] = useState(() => localStorage.getItem("theme") !== "light");
  const [palette, setPalette] = useState<PaletteId>(() => (localStorage.getItem("palette") as PaletteId | null) ?? "mv-gold");
  const [customColor, setCustomColor] = useState(() => localStorage.getItem("custom-color") ?? "#f47c20");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
    localStorage.setItem("palette", palette);
    localStorage.setItem("custom-color", customColor);

    const selected = getPalette(palette);
    const primary = palette === "custom" ? hexToHsl(customColor) : dark ? selected.dark : selected.light;
    document.documentElement.style.setProperty("--primary", primary);
    document.documentElement.style.setProperty("--accent", primary);
    document.documentElement.style.setProperty("--ring", primary);
    document.documentElement.style.setProperty("--primary-foreground", primaryForegroundFor(primary));
  }, [customColor, dark, palette]);

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

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
