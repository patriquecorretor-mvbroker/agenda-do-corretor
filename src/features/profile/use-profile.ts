import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, upsertProfile } from "@/features/profile/profile-service";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { Profile } from "@/types/database";

const demoProfile: Profile = {
  id: "demo-profile",
  user_id: "demo-user",
  nome: "Patrique Lopes",
  foto: null,
  logo: "/brand/mv-broker-logo.jpg",
  nome_marca: "MV Broker",
  telefone: null,
  whatsapp: null,
  email: "demo@agenda.local",
  creci: "CRECI 000000",
  cidade: "Capão da Canoa, RS",
  empresa: "Agenda do Corretor",
  horario_inicio: "08:00",
  horario_fim: "18:00",
  meta_vgv_mensal: 5000000,
  meta_vendas_mensal: 5,
  meta_comissao_mensal: 50000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

function readDemoProfile() {
  const saved = localStorage.getItem("agenda-demo-profile");
  return saved ? (JSON.parse(saved) as Profile) : demoProfile;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => (hasSupabaseConfig ? getProfile(user!.id) : readDemoProfile()),
    enabled: Boolean(user)
  });

  const saveProfile = useMutation({
    mutationFn: async (profile: Partial<Profile> & { user_id: string }) => {
      if (hasSupabaseConfig) return upsertProfile(profile);
      const next = { ...readDemoProfile(), ...profile, updated_at: new Date().toISOString() };
      localStorage.setItem("agenda-demo-profile", JSON.stringify(next));
      return next;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", user?.id], data);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    }
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    saveProfile
  };
}
