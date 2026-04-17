import { fetchCurrentUser } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "../auth/use-auth-token";

export type { User } from "@/api";

export const useUser = () => {
  const { data: token } = useAuthToken();

  const query = useQuery({
    queryKey: ["@me", token],
    queryFn: () => fetchCurrentUser(token as string),
    enabled: !!token,
  });

  return query;
};
