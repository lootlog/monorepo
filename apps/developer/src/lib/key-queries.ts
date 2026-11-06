import { QueryClient, queryOptions } from "@tanstack/react-query";
import { getPortalEnvironment } from "~/lib/environment";
import {
  decodeKeyList,
  decodeOrganizations,
  keyRequest,
} from "~/lib/key-client";

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
    queryFn: async ({ signal }) =>
      decodeKeyList(await keyRequest("", { signal })).keys,
  });

export const keyOrganizationsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["key-organizations", userId],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${getPortalEnvironment(location.hostname).main}/users/@me/guilds/accessible`,
        { credentials: "include", signal },
      );

      if (!response.ok) throw new Error("Organization request failed");

      return decodeOrganizations(await response.json());
    },
  });
