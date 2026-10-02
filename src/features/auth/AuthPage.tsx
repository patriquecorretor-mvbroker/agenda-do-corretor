import { useState } from "react";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { hasSupabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/features/auth/auth-context";
import { LegalDocumentDialog } from "@/features/legal/LegalDocumentDialog";
import { legalVersions, type LegalDocumentType } from "@/features/legal/legal-content";

type Mode = "login" | "signup" | "reset";

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentType | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await signIn(email, password);
      if (mode === "signup") {
        if (!acceptedLegal) throw new Error("Aceite os Termos de Uso e a Política de Privacidade para criar a conta.");
        await signUp(email, password, {
          termsVersion: legalVersions.terms,
          privacyVersion: legalVersions.privacy,
          acceptedAt: new Date().toISOString()
        });
      }
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(218,165,57,0.26),_transparent_34%),linear-gradient(135deg,#050403,#15100a_48%,#faf8f1_48%)] p-4 text-foreground dark:from-background">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-8 md:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] p-4 text-white md:p-8">
          <div className="mb-10 flex items-center gap-3">
            <img
              src="/icons/app-icon-master.png"
              alt="Agenda do Corretor"
              className="h-16 w-16 rounded-2xl border border-primary/40 object-cover shadow-[0_18px_44px_rgba(218,165,57,0.28)]"
            />
            <div>
              <h1 className="text-xl font-semibold">MV Broker</h1>
              <p className="text-sm text-white/65">Sistema de suporte imobiliário</p>
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
                  <h2 className="text-2xl font-semibold">Entrar na agenda</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    A versão publicada ainda não recebeu as chaves do Supabase. Enquanto isso, você pode entrar em modo demonstração para testar a agenda no celular.
                  </p>
                </div>
                <Button className="w-full" size="lg" onClick={() => signIn("demo@agenda.local", "demo")}>
                  Entrar na agenda agora
                </Button>
                <div className="rounded-2xl border bg-muted/50 p-4 text-sm text-muted-foreground">
                  Os dados desse modo ficam somente neste navegador. Para login real e sincronização entre dispositivos, basta configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
                </div>
                <LegalLinks onOpen={setLegalDocument} />
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
                {mode === "signup" && (
                  <label className="flex items-start gap-3 rounded-2xl border bg-muted/35 p-4 text-sm leading-5">
                    <input type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                    <span>
                      Li e aceito os <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setLegalDocument("terms")}>Termos de Uso</button> e a <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setLegalDocument("privacy")}>Política de Privacidade</button>.
                    </span>
                  </label>
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
                <LegalLinks onOpen={setLegalDocument} />
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <LegalDocumentDialog document={legalDocument} onOpenChange={(open) => !open && setLegalDocument(null)} />
    </main>
  );
}

function LegalLinks({ onOpen }: { onOpen: (document: LegalDocumentType) => void }) {
  return <div className="flex justify-center gap-4 text-xs text-muted-foreground"><button type="button" className="hover:text-foreground" onClick={() => onOpen("terms")}>Termos de Uso</button><button type="button" className="hover:text-foreground" onClick={() => onOpen("privacy")}>Privacidade</button></div>;
}
