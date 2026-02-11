import { API_URL } from "@/config/api";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { isDevMode } from "@/lib/is-dev-mode";
import { useQuery } from "@tanstack/react-query";

export type RuntimeUserAddon = {
  runtimeId: string;
  name: string;
  description?: string | null;
  version: string;
  installed: boolean;
  compiledCode: string;
  updatedAt: string;
};

export const useRuntimeUserAddons = (enabled = true) => {
  const { client } = useAuthenticatedApiClient();

  return useQuery({
    queryKey: ["runtime-user-addons"],
    queryFn: () =>
      client.get<RuntimeUserAddon[]>(`${API_URL}/users/@me/addons/runtime`, {
        withCredentials: true,
      }),
    select: (response) => response.data,
    enabled: enabled && isDevMode,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });
};
