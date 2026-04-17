import { useQuery } from "@tanstack/react-query";
import { fetchAuthScopes } from "@/api";

export const useAuthScopes = () => {
  const query = useQuery({
    queryKey: ["auth-scopes"],
    queryFn: () => fetchAuthScopes(),
  });

  return query;
};
