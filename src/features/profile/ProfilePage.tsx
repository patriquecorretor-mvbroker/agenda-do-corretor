import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { useProfile } from "@/features/profile/use-profile";

export function ProfilePage() {
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
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-muted">
              {profile?.foto ? <img src={profile.foto} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-muted-foreground" />}
            </div>
            <CardTitle>{profile?.nome}</CardTitle>
            <CardDescription>{profile?.empresa} • {profile?.cidade}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>CRECI: {profile?.creci ?? "não informado"}</p>
            <p>WhatsApp: {profile?.whatsapp ?? "não informado"}</p>
            <p>Horário: {profile?.horario_inicio?.slice(0, 5)} - {profile?.horario_fim?.slice(0, 5)}</p>
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
