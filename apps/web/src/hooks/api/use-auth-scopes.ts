import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

export const useAuthScopes = () => {
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["auth-scopes"],
    queryFn: () => client.get<string[]>(`/users/@me/scopes`),
    select: (response) => response.data,
  });

  return query;
};
