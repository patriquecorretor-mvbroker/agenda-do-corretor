import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/ProfileForm";

export function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(231,200,115,0.18),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)))] p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-4xl items-center">
        <Card className="glass-card">
          <CardHeader className="space-y-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-3xl">Vamos configurar sua base</CardTitle>
              <CardDescription className="mt-2 text-base">
                Preencha os dados essenciais para abrir o Meu Dia com horários, cidade, CRECI e metas corretas.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileForm compact />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
