import { useState } from "react";
import { BellRing, Check, Download, Laptop, Loader2, Moon, Palette, ShieldCheck, Sparkles, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getPalette, palettes, type PaletteId } from "@/lib/appearance";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { downloadAccountExport, exportAccountData, requestAccountDeletion } from "@/features/legal/account-data";
import { LegalDocumentDialog } from "@/features/legal/LegalDocumentDialog";
import type { LegalDocumentType } from "@/features/legal/legal-content";
import { useNotifications } from "@/features/notifications/use-notifications";
import { usePwaInstall } from "@/lib/pwa-install";

export function SettingsPage({
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
  const selected = getPalette(palette);
  const { user, isDemo } = useAuth();
  const { toast } = useToast();
  const [legalDocument, setLegalDocument] = useState<LegalDocumentType | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const notifications = useNotifications();
  const pwaInstall = usePwaInstall();

  async function handleInstall() {
    if (pwaInstall.state === "available") {
      const installed = await pwaInstall.install();
      toast({ title: installed ? "Agenda instalada neste computador." : "Instalação cancelada." });
      return;
    }
    toast({ title: pwaInstall.state === "installed" ? "A Agenda já está instalada." : "Abra o menu do Chrome e escolha Instalar Agenda do Corretor." });
  }

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      downloadAccountExport(await exportAccountData(user.id));
      toast({ title: "Seus dados foram exportados." });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Não foi possível exportar os dados.", variant: "error" });
    } finally { setExporting(false); }
  }

  async function handleDeletionRequest() {
    if (!user) return;
    setDeleting(true);
    try {
      await requestAccountDeletion(user.id, user.email);
      setConfirmDeletion(false);
      toast({ title: isDemo ? "Solicitação registrada neste navegador." : "Solicitação de exclusão registrada." });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Não foi possível registrar a solicitação.", variant: "error" });
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-5">
      <section className="theme-gradient overflow-hidden rounded-[2rem] p-5 text-white shadow-[0_24px_70px_rgba(6,10,18,0.22)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Identidade visual
            </div>
            <h1 className="text-3xl font-semibold md:text-5xl">Sua agenda, do seu jeito.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Escolha uma identidade completa e alterne entre claro e escuro sem perder contraste.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/12 bg-black/20 p-1.5 backdrop-blur-xl">
            <button type="button" onClick={() => onDarkChange(false)} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white/55 transition", !dark && "bg-white text-[#111827] shadow-lg")}><Sun className="h-4 w-4" />Claro</button>
            <button type="button" onClick={() => onDarkChange(true)} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white/55 transition", dark && "bg-white text-[#111827] shadow-lg")}><Moon className="h-4 w-4" />Escuro</button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Paletas premium</CardTitle>
            <CardDescription>Quatro combinações completas para toda a interface.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {palettes.map((item) => {
              const active = palette === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPaletteChange(item.id)}
                  aria-pressed={active}
                  className={cn(
                    "group overflow-hidden rounded-[1.35rem] border bg-card text-left shadow-[0_6px_24px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)]",
                    active && "border-primary ring-2 ring-primary/20"
                  )}
                >
                  <div className="relative h-24 overflow-hidden p-3" style={{ backgroundImage: item.gradient }}>
                    <div className="absolute inset-x-3 bottom-3 flex items-end gap-2">
                      <span className="h-10 flex-1 rounded-xl border border-white/15 bg-white/10 backdrop-blur" />
                      <span className="h-7 w-16 rounded-lg" style={{ backgroundColor: item.preview }} />
                    </div>
                    {active && <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-[#101828] shadow-lg"><Check className="h-4 w-4" /></span>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{item.name}</h3>
                      <span className="flex -space-x-1.5">{item.swatches.map((color) => <span key={color} className="h-5 w-5 rounded-full border-2 border-card" style={{ backgroundColor: color }} />)}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cor da sua marca</CardTitle>
            <CardDescription>Uma quinta opção para destacar a identidade do corretor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button type="button" onClick={() => onPaletteChange("custom")} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", palette === "custom" && "border-primary ring-2 ring-primary/20")}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl shadow-inner" style={{ backgroundColor: customColor }}><Palette className="h-5 w-5 text-white drop-shadow" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Personalizada</span><span className="block truncate text-xs text-muted-foreground">{customColor.toUpperCase()}</span></span>
              {palette === "custom" && <Check className="h-4 w-4 text-primary" />}
            </button>
            <div className="space-y-2">
              <Label htmlFor="custom-color">Selecionar cor</Label>
              <div className="flex gap-3">
                <Input id="custom-color" type="color" value={customColor} onChange={(event) => { onCustomColorChange(event.target.value); onPaletteChange("custom"); }} className="h-12 w-16 shrink-0 cursor-pointer p-1" />
                <Input value={customColor} onChange={(event) => { onCustomColorChange(event.target.value); onPaletteChange("custom"); }} maxLength={7} />
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/45 p-4">
              <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Prévia ativa</p><p className="mt-1 font-semibold">{palette === "custom" ? "Personalizada" : selected.name}</p></div><span className="h-9 w-9 rounded-xl bg-primary shadow-[0_8px_20px_hsl(var(--primary)/0.24)]" /></div>
              <Button className="mt-4 w-full">Concluir compromisso</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Laptop className="h-5 w-5" /></span><div><CardTitle>Instalar aplicativo</CardTitle><CardDescription>Use a Agenda em uma janela própria, com ícone no computador e acesso rápido.</CardDescription></div></div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold">{pwaInstall.state === "installed" ? "Instalada neste dispositivo" : pwaInstall.state === "available" ? "Pronta para instalar" : "Instalação pelo navegador"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{pwaInstall.state === "unavailable" ? "No Chrome, abra o menu de três pontos, procure Salvar e compartilhar e escolha Instalar Agenda do Corretor." : pwaInstall.state === "installed" ? "Você pode abrir a Agenda pelo menu Iniciar ou pelo atalho criado." : "O Chrome abrirá a confirmação nativa de instalação."}</p></div>
          <Button className="w-full sm:w-auto" onClick={() => void handleInstall()} disabled={pwaInstall.state === "installed"}><Download className="h-4 w-4" />{pwaInstall.state === "installed" ? "Já instalada" : "Instalar aplicativo"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BellRing className="h-5 w-5" /></span><div><CardTitle>Lembretes e notificações</CardTitle><CardDescription>Escolha o que merece interromper seu dia. O pedido de permissão só acontece quando você tocar em ativar.</CardDescription></div></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Notificações push</p><p className="mt-1 text-xs text-muted-foreground">{notifications.pushState === "enabled" ? "Ativas neste dispositivo." : notifications.pushState === "blocked" ? "Bloqueadas nas configurações do navegador." : notifications.configured ? "Prontas para serem ativadas. No iPhone, abra o PWA instalado pela Tela de Início." : "Aguardando a chave pública do OneSignal."}</p></div><Button onClick={() => void notifications.enablePush.mutateAsync().then(() => toast({ title: "Notificações ativadas neste dispositivo." })).catch((error) => toast({ title: error instanceof Error ? error.message : "Não foi possível ativar.", variant: "error" }))} disabled={!notifications.configured || notifications.pushState === "enabled" || notifications.enablePush.isPending}>{notifications.enablePush.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}{notifications.pushState === "enabled" ? "Ativadas" : "Ativar neste aparelho"}</Button></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[
            ["appointments", "Compromissos"], ["tasks", "Tarefas"], ["follow_ups", "Follow-ups"], ["finance", "Contas e vencimentos"], ["commissions", "Comissões"], ["market_news", "Notícias do mercado"]
          ].map(([key, label]) => <label key={key} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 text-sm font-medium"><span>{label}</span><input type="checkbox" checked={Boolean(notifications.preferences[key as keyof typeof notifications.preferences])} onChange={(event) => void notifications.savePreferences.mutateAsync({ [key]: event.target.checked })} className="h-4 w-4 accent-primary" /></label>)}</div>
          <div className="grid gap-3 sm:grid-cols-3"><div><Label htmlFor="reminder-minutes">Avisar antes</Label><select id="reminder-minutes" value={notifications.preferences.reminder_minutes} onChange={(event) => void notifications.savePreferences.mutateAsync({ reminder_minutes: Number(event.target.value) })} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="5">5 minutos</option><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option><option value="1440">1 dia</option></select></div><div><Label htmlFor="quiet-start">Silenciar a partir de</Label><Input id="quiet-start" type="time" className="mt-2" value={notifications.preferences.quiet_start.slice(0,5)} onChange={(event) => void notifications.savePreferences.mutateAsync({ quiet_start: event.target.value })} /></div><div><Label htmlFor="quiet-end">Voltar a avisar às</Label><Input id="quiet-end" type="time" className="mt-2" value={notifications.preferences.quiet_end.slice(0,5)} onChange={(event) => void notifications.savePreferences.mutateAsync({ quiet_end: event.target.value })} /></div></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span><div><CardTitle>Privacidade e seus dados</CardTitle><CardDescription>Consulte os documentos, baixe uma cópia dos dados da conta ou solicite a exclusão.</CardDescription></div></div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Button variant="outline" onClick={() => setLegalDocument("terms")}>Termos de Uso</Button>
          <Button variant="outline" onClick={() => setLegalDocument("privacy")}>Política de Privacidade</Button>
          <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Exportar meus dados</Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmDeletion(true)}><Trash2 className="h-4 w-4" />Solicitar exclusão</Button>
          <p className="md:col-span-2 xl:col-span-4 text-xs leading-5 text-muted-foreground">A exclusão é processada após validação administrativa e pode preservar registros exigidos por lei. {isDemo && "No modo demonstração, a solicitação fica registrada apenas neste navegador."}</p>
        </CardContent>
      </Card>
      <LegalDocumentDialog document={legalDocument} onOpenChange={(open) => !open && setLegalDocument(null)} />
      <ConfirmDialog open={confirmDeletion} onOpenChange={setConfirmDeletion} title="Solicitar exclusão da conta?" description="A solicitação será registrada para análise. Seus dados não serão apagados imediatamente e você continuará com acesso até o processamento." confirmLabel="Registrar solicitação" onConfirm={() => void handleDeletionRequest()} />
      {deleting && <span className="sr-only" role="status">Registrando solicitação de exclusão.</span>}
    </div>
  );
}
