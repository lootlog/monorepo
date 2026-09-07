import type { QueryClient } from "@tanstack/react-query";

// A permission update can narrow NPC visibility without removing membership.
// Drop the old data immediately: invalidation alone exposes it during refetch
// and after a forbidden response. Reset also cancels outstanding old requests.
export const resetPermissionQueries = (queryClient: QueryClient) =>
  queryClient.resetQueries({
    predicate: ({ queryKey }) => {
      const path = queryKey[0];
      return (
        typeof path === "string" &&
        (/^\/(guilds|timers)(\/|$)/.test(path) ||
          /^\/users\/@me\/(guilds|feed)(\/|$)/.test(path) ||
          /^\/messaging\/party-gathering(\/|$)/.test(path))
      );
    },
  });
