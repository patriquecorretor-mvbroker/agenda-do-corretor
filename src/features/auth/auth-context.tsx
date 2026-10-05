import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

type AppUser = Pick<User, "id" | "email">;
type LegalAcceptance = { termsVersion: string; privacyVersion: string; acceptedAt: string };

type AuthContextValue = {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  recoveringPassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, legal: LegalAcceptance) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

prepareCleanLocalMvp();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(() => safeStorageGet("agenda-demo-session") === "true");
  const [recoveringPassword, setRecoveringPassword] = useState(() => isRecoveryUrl());
  const [loading, setLoading] = useState(hasSupabaseConfig);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const loadingTimeout = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 5000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setRecoveringPassword(true);
      setLoading(false);
    });

    return () => {
      active = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? (!hasSupabaseConfig && demoEnabled ? { id: "demo-user", email: "demo@agenda.local" } : null),
      session,
      loading,
      isDemo: !hasSupabaseConfig && demoEnabled,
      recoveringPassword,
      async signIn(email, password) {
        if (!supabase) {
          safeStorageSet("agenda-demo-session", "true");
          setDemoEnabled(true);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, legal) {
        if (!supabase) {
          safeStorageSet("agenda-legal-acceptance", JSON.stringify(legal));
          safeStorageSet("agenda-demo-session", "true");
          setDemoEnabled(true);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              terms_version: legal.termsVersion,
              privacy_version: legal.privacyVersion,
              legal_accepted_at: legal.acceptedAt
            }
          }
        });
        if (error) throw error;
      },
      async resetPassword(email) {
        if (!supabase) throw new Error("Supabase não configurado.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?auth=recovery`
        });
        if (error) throw error;
      },
      async updatePassword(password) {
        if (!supabase) throw new Error("Supabase não configurado.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecoveringPassword(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      },
      async signOut() {
        if (!supabase) {
          safeStorageRemove("agenda-demo-session");
          setDemoEnabled(false);
          setRecoveringPassword(false);
          return;
        }
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setRecoveringPassword(false);
      }
    }),
    [demoEnabled, loading, recoveringPassword, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isRecoveryUrl() {
  if (typeof window === "undefined") return false;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("auth") === "recovery" || query.get("type") === "recovery" || hash.get("type") === "recovery";
}

function prepareCleanLocalMvp() {
  if (hasSupabaseConfig || typeof window === "undefined") return;
  const marker = "agenda-clean-mvp-v1";
  try {
    if (localStorage.getItem(marker) === "true") return;
    const visualPreferences = {
      theme: localStorage.getItem("theme"),
      palette: localStorage.getItem("palette"),
      customColor: localStorage.getItem("custom-color")
    };
    localStorage.clear();
    if (visualPreferences.theme) localStorage.setItem("theme", visualPreferences.theme);
    if (visualPreferences.palette) localStorage.setItem("palette", visualPreferences.palette);
    if (visualPreferences.customColor) localStorage.setItem("custom-color", visualPreferences.customColor);
    localStorage.setItem(marker, "true");
    for (const database of ["agenda-corretor-files", "agenda-corretor-media", "agenda-corretor-condominium-assets"]) {
      indexedDB.deleteDatabase(database);
    }
  } catch {
    // Browsers with restricted storage still receive the empty in-memory defaults.
  }
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
    // Alguns navegadores bloqueiam armazenamento em contexto incorporado.
  }
}

function safeStorageRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Mantém a interface utilizável mesmo sem acesso ao armazenamento local.
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
