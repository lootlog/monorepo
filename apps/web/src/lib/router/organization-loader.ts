import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import type { QueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildByIdQueryOptions,
  getGuildsControllerGetGuildPermissionsQueryOptions,
  getMembersControllerGetMeQueryOptions,
} from "@lootlog/client/main";
import { throwForbiddenRouteError } from "@/lib/router/route-errors";
import {
  ensureRouteQueryData,
  fetchRouteQueryData,
} from "@/lib/router/route-prefetch";

export const loadOrganization = async (
  queryClient: QueryClient,
  guildId: string,
  { startup = false }: { startup?: boolean } = {},
) => {
  const query = startup
    ? { retry: false as const, networkMode: "always" as const }
    : {};

  const loadQuery = startup ? fetchRouteQueryData : ensureRouteQueryData;

  const [guild, guildMember, permissions] = await Promise.all([
    loadQuery(
      queryClient,
      getGuildsControllerGetGuildByIdQueryOptions({ guildId }, { query }),
    ),
    loadQuery(
      queryClient,
      getMembersControllerGetMeQueryOptions(
        { guildId },
        { query: { staleTime: 30_000, ...query } },
      ),
    ),
    loadQuery(
      queryClient,
      getGuildsControllerGetGuildPermissionsQueryOptions(
        { guildId },
        { query: { staleTime: 30_000, ...query } },
      ),
    ),
  ]);

  const accessPolicy = createAccessPolicy({ capabilities: permissions });

  if (!accessPolicy.allows(Capability.OWNER) && !guildMember?.active) {
    throwForbiddenRouteError();
  }

  return { guild, guildMember, accessPolicy };
};
