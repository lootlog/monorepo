import { AUTH_SERVICE_URL } from "@/config/auth";
import { useSession } from "@/hooks/auth/use-session";
import { useQuery } from "@tanstack/react-query";

export const useAuthToken = () => {
  const session = useSession();
  const isAuthenticated = !!session.data;
  const sessionToken = session.data?.session.token;

  const query = useQuery({
    queryKey: ["auth-token"],
    enabled: isAuthenticated && !!sessionToken,
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

  return query;
};
