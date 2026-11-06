import {
  Capability,
  createAccessPolicy,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import type { QueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildByIdQueryOptions,
  getGuildsControllerGetGuildPermissionsQueryOptions,
  getGuildsControllerGetWorldsByGuildIdQueryOptions,
  getListEventHeroTimersQueryOptions,
  getListEventsQueryOptions,
  getListPinnedEventsQueryOptions,
  getMembersControllerGetMeQueryOptions,
} from "@lootlog/client/main";
import { throwForbiddenRouteError } from "@/lib/router/route-errors";
import {
  ensureRouteQueryData,
  fetchRouteQueryData,
  settleRoutePrefetches,
} from "@/lib/router/route-prefetch";
import { canViewEvents } from "@/navigation/app-navigation";

/**
 * How long opening an Organization keeps the previous page painted before
 * its skeleton shows; most opens finish sooner and swap in one step.
 */
export const ORGANIZATION_OPEN_PENDING_MS = 400;

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

/**
 * Loads what the Organization's shell shows around every page: the world
 * switcher's worlds and, for a member who can see events, the sidebar's
 * pinned events with the featured one's timers and the active event badge.
 * Waiting for them lets a move between Organizations land in one step.
 */
export const loadOrganizationShell = (
  queryClient: QueryClient,
  guildId: string,
  accessPolicy: AccessPolicy,
) => {
  const prefetches: Promise<unknown>[] = [
    ensureRouteQueryData(
      queryClient,
      getGuildsControllerGetWorldsByGuildIdQueryOptions({ guildId }),
    ),
  ];

  if (canViewEvents(accessPolicy)) {
    prefetches.push(
      ensureRouteQueryData(
        queryClient,
        getListEventsQueryOptions({ guildId }, { activeOnly: true }),
      ),
      ensureRouteQueryData(
        queryClient,
        getListPinnedEventsQueryOptions({ guildId }),
      ).then((pinnedEvents) => {
        const featuredEvent = pinnedEvents[0]?.event;

        if (!featuredEvent?.world) return;

        return ensureRouteQueryData(
          queryClient,
          getListEventHeroTimersQueryOptions(
            { guildId, eventId: featuredEvent.id },
            { world: featuredEvent.world },
          ),
        );
      }),
    );
  }

  return settleRoutePrefetches(prefetches);
};
