import { useQuery } from "@tanstack/react-query";
import { useWikiContext } from "@/contexts/wiki-context";

export const SESSION_QUERY_KEY = ["session"] as const;

/** The signed-in User, shared with the Web app through the auth cookie. */
export const useSession = () => {
  const { authClient } = useWikiContext();

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: ({ signal }) =>
      authClient.getSession({ fetchOptions: { signal } }),
    select: (result) => result.data ?? null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    session: query.data ?? null,
    isPending: query.isPending,
  };
};
