import { useSession } from "hooks/auth/use-session";
import { apiClient } from "lib/api-client";

export const useApiClient = () => {
  const { data: session } = useSession();

  return { client: apiClient, isAuthenticated: !!session };
};
