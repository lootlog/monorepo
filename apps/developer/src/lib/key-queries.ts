import { QueryClient, queryOptions } from "@tanstack/react-query";
import { apiKeysListApiKeys } from "@lootlog/client/auth";
import {
  usersControllerGetCurrentUserAccessibleGuilds,
  usersControllerGetUserLimits,
} from "@lootlog/client/main";

export const createKeyQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  });

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

export const keyLimitsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["key-limits", userId],
    queryFn: ({ signal }) => usersControllerGetUserLimits({ signal }),
  });
