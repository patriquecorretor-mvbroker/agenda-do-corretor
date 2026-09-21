import { LogOut, Moon, Palette, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { useProfile } from "@/features/profile/use-profile";
import { cn } from "@/lib/utils";
import { palettes, type PaletteId } from "@/lib/appearance";

export function ProfilePage({
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
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const { toast } = useToast();

  async function handleSignOut() {
    await signOut();
    toast({ title: "Sessão encerrada." });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Perfil do corretor</p>
          <h1 className="text-3xl font-semibold">{profile?.nome ?? "Meu perfil"}</h1>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-muted">
                {profile?.foto ? <img src={profile.foto} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-muted-foreground" />}
              </div>
              {profile?.logo && <img src={profile.logo} alt={`Logo ${profile.nome_marca ?? profile.empresa ?? ""}`} className="h-16 w-16 rounded-2xl border object-cover" />}
            </div>
            <CardTitle>{profile?.nome}</CardTitle>
            <CardDescription>{profile?.nome_marca || profile?.empresa} • {profile?.cidade}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>CRECI: {profile?.creci ?? "não informado"}</p>
            <p>WhatsApp: {profile?.whatsapp ?? "não informado"}</p>
            <p>Horário: {profile?.horario_inicio?.slice(0, 5)} - {profile?.horario_fim?.slice(0, 5)}</p>
          </CardContent>
        </Card>

        <Card className="xl:row-span-1">
          <CardHeader>
            <CardTitle>Aparência do sistema</CardTitle>
            <CardDescription>Escolha modo escuro/claro e a cor principal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={!dark ? "default" : "outline"} onClick={() => onDarkChange(false)}>
                <Sun className="h-4 w-4" />
                Claro
              </Button>
              <Button type="button" variant={dark ? "default" : "outline"} onClick={() => onDarkChange(true)}>
                <Moon className="h-4 w-4" />
                Escuro
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
              {palettes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPaletteChange(item.id)}
                  className={cn("rounded-2xl border bg-card p-3 text-left transition hover:shadow-soft", palette === item.id && "border-primary ring-2 ring-primary/25")}
                >
                  <span className="mb-3 block h-8 w-8 rounded-xl" style={{ backgroundColor: item.id === "custom" ? customColor : item.preview }} />
                  <span className="block text-sm font-semibold">{item.name}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-2xl border p-3">
              <Palette className="h-5 w-5 text-primary" />
              <Input
                type="color"
                value={customColor}
                onChange={(event) => {
                  onCustomColorChange(event.target.value);
                  onPaletteChange("custom");
                }}
                className="h-11 w-16 p-1"
              />
              <Input
                value={customColor}
                onChange={(event) => {
                  onCustomColorChange(event.target.value);
                  onPaletteChange("custom");
                }}
                maxLength={7}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editar perfil</CardTitle>
            <CardDescription>Esses dados alimentam Meu Dia, metas e configurações futuras.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
