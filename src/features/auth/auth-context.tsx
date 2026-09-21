import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

type AppUser = Pick<User, "id" | "email">;

type AuthContextValue = {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(() => safeStorageGet("agenda-demo-session") === "true");
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
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
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
      async signIn(email, password) {
        if (!supabase) {
          safeStorageSet("agenda-demo-session", "true");
          setDemoEnabled(true);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password) {
        if (!supabase) {
          safeStorageSet("agenda-demo-session", "true");
          setDemoEnabled(true);
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      async resetPassword(email) {
        if (!supabase) throw new Error("Supabase não configurado.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
      },
      async signOut() {
        if (!supabase) {
          safeStorageRemove("agenda-demo-session");
          setDemoEnabled(false);
          return;
        }
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    }),
    [demoEnabled, loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
