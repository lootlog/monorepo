import { useQuery } from "@tanstack/react-query";
import { authApiClient } from "@/lib/api-client/api-client";

export const useAuthScopes = () => {
  const query = useQuery({
    queryKey: ["auth-scopes"],
    queryFn: () => authApiClient.get<string[]>(`/auth/@me/scopes`),
    select: (response) => response.data,
  });

  return query;
};
