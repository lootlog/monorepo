import { fetchAuthToken } from "@/api";
import { useSession } from "@/hooks/auth/use-session";
import { useQuery } from "@tanstack/react-query";

export const useAuthToken = () => {
  const session = useSession();
  const sessionToken = session.data?.session.token;

  return useQuery({
    queryKey: ["auth-token"],
    enabled: Boolean(sessionToken),
    queryFn: () => fetchAuthToken(sessionToken as string),
    refetchOnMount: true,
  });
};
