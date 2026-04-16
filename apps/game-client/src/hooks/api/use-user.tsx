import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/api";
import { useAuthToken } from "../auth/use-auth-token";
export type { User } from "@/api";

export const useUser = () => {
  const { data: token } = useAuthToken();

  const query = useQuery({
    queryKey: ["@me"],
    queryFn: () => fetchCurrentUser(token as string),
    enabled: !!token,
  });

  return query;
};
