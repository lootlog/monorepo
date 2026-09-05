import type { QueryClient } from "@tanstack/react-query";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@lootlog/client/main";
import { canManageGuild } from "@/lib/guild-permissions";
import {
  throwForbiddenRouteError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import {
  ensureRouteQueryData,
  prefetchRouteQuery,
} from "@/lib/router/route-prefetch";

export const loadGuildSettings = ({
  abortController,
  context,
  params,
  preload,
}: {
  abortController: AbortController;
  context: { queryClient: QueryClient };
  params: { guildId: string };
  preload: boolean;
}) =>
  withRouteLoaderCancellation(abortController, async () => {
    const permissionsQueryOptions =
      getGuildsControllerGetGuildPermissionsQueryOptions(
        { guildId: params.guildId },
        {
          query: {
            queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
              guildId: params.guildId,
            }),
            staleTime: 30_000,
          },
        },
      );

    if (preload) {
      void prefetchRouteQuery(context.queryClient, permissionsQueryOptions);
      return null;
    }

    const permissions = await ensureRouteQueryData(
      context.queryClient,
      permissionsQueryOptions,
    );

    if (!canManageGuild(createAccessPolicy({ capabilities: permissions }))) {
      throwForbiddenRouteError();
    }

    return null;
  });
