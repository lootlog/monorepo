import { QueryClient, queryOptions } from "@tanstack/react-query";
import { apiKeysListApiKeys } from "@lootlog/client/auth";
import { usersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";

/** Keys change only through this page, so nothing refetches on its own. */
export const createKeyQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  });

/** Scoped to the signed-in User, so another User never sees cached keys. */
export const apiKeysQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["api-keys", userId],
    queryFn: async ({ signal }) => (await apiKeysListApiKeys({ signal })).keys,
  });

export const keyOrganizationsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["key-organizations", userId],
    queryFn: ({ signal }) =>
      usersControllerGetCurrentUserAccessibleGuilds({ signal }),
  });
