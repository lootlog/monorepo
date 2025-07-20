import { useQuery } from "@tanstack/react-query";
import {
  useApiClient,
  useAuthenticatedApiClient,
} from "@/hooks/api/use-api-client";

export const useAuthScopes = () => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["auth-scopes"],
    queryFn: () => client.get<string[]>(`/users/@me/scopes`),
    select: (response) => response.data,
  });

  return query;
};
