import { AUTH_SERVICE_URL } from "@/config/auth";
import { useSession } from "@/hooks/auth/use-session";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export const useAuthToken = () => {
  const { data: session } = useSession();
  const sessionToken = session?.session.token;

  return useQuery({
    queryKey: queryKeys.auth.token(),
    enabled: Boolean(sessionToken),
    select: (data: { token: string }) => data.token,
    queryFn: async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/idp/token`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch auth token");
      }

      return response.json();
    },
  });
};
