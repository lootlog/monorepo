import { apiClient } from "@/lib/api-client";
import { useSession } from "hooks/auth/use-session";

export const useApiClient = () => {
  const { data: session } = useSession();

  return { client: apiClient, isAuthenticated: false };
};
