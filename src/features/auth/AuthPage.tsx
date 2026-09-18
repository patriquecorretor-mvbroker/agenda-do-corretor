import { useState } from "react";
import { Building2, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { hasSupabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/features/auth/auth-context";

type Mode = "login" | "signup" | "reset";

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await signIn(email, password);
      if (mode === "signup") await signUp(email, password);
      if (mode === "reset") await resetPassword(email);
      toast({
        title:
          mode === "reset"
            ? "Enviamos as instruções de recuperação."
            : mode === "signup"
              ? "Conta criada. Verifique seu e-mail se a confirmação estiver ativa."
              : "Login realizado."
      });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Não foi possível continuar.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(231,200,115,0.22),_transparent_34%),linear-gradient(135deg,#07151f,#0d2a38_48%,#f6f8f8_48%)] p-4 text-foreground dark:from-background">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-8 md:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] p-4 text-white md:p-8">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Agenda do Corretor</h1>
              <p className="text-sm text-white/65">Sua rotina comercial no bolso.</p>
            </div>
          </div>
          <h2 className="max-w-xl text-4xl font-semibold leading-tight md:text-6xl">
            Comece pelo dia certo. O resto escala depois.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
            Uma base PWA premium para agenda, tarefas, metas e perfil do corretor, preparada para crescer sem virar bagunça.
          </p>
        </section>

        <Card className="glass-card">
          <CardContent className="p-6 md:p-8">
            {!hasSupabaseConfig ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold">Configure o Supabase</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Para login real, cadastros e dados privados por usuário, preencha as variáveis de ambiente
                    `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` usando `.env.example`.
                  </p>
                </div>
                <div className="rounded-2xl border bg-muted/50 p-4 text-sm text-muted-foreground">
                  O app não usa `service_role` no cliente. As migrations incluem RLS para que cada corretor veja apenas os próprios dados.
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <h2 className="text-2xl font-semibold">
                    {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {mode === "login"
                      ? "Acesse seu painel diário."
                      : mode === "signup"
                        ? "Cadastre-se para iniciar o onboarding."
                        : "Informe seu e-mail para receber as instruções."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" className="pl-11" value={email} onChange={(event) => setEmail(event.target.value)} required />
                  </div>
                </div>
                {mode !== "reset" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="password" type="password" className="pl-11" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
                    </div>
                  </div>
                )}
                <Button className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar recuperação"}
                </Button>
                <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
                  <button type="button" className="font-medium text-foreground" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                    {mode === "login" ? "Criar conta" : "Já tenho conta"}
                  </button>
                  <span>•</span>
                  <button type="button" className="font-medium text-foreground" onClick={() => setMode("reset")}>
                    Esqueci a senha
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
