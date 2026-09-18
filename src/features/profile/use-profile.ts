import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, upsertProfile } from "@/features/profile/profile-service";
import { useAuth } from "@/features/auth/auth-context";

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: Boolean(user)
  });

  const saveProfile = useMutation({
    mutationFn: upsertProfile,
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
