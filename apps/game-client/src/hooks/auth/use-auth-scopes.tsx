import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export const useAuthScopes = () => {
  const { client } = useAuthenticatedApiClient("auth");

  const query = useQuery({
    queryKey: ["auth-scopes"],
    queryFn: () => client.get<string[]>(`/auth/@me/scopes`),
    select: (response) => {
      const data = response.data;
      return Array.isArray(data) ? data : [];
    },
  });

  return query;
};
