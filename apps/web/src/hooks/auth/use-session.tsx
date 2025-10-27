import { useQuery } from "@tanstack/react-query";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import type { authClient } from "@/lib/auth-client";

export type SessionData = typeof authClient.$Infer.Session;

export const useSession = () => {
  const query = useQuery({
    ...sessionQueryOptions,
    select: (data) => data?.data ?? null,
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isLoading: query.isLoading,
    error: query.error,
  };
};
