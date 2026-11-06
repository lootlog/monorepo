import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@lootlog/client/main";
import { LootsListPage } from "@/features/guild/loots-list/loots-list";
import { LootsListPageSkeleton } from "@/features/guild/loots-list/loots-list-page-skeleton";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { ORGANIZATION_OPEN_PENDING_MS } from "@/lib/router/organization-loader";
import {
  ensureRouteQueryData,
  prefetchRouteInfiniteQuery,
  settleRoutePrefetches,
} from "@/lib/router/route-prefetch";
import { readGuildWorld } from "@/hooks/context/use-guild-world";
import { loadLootsFilters } from "@/hooks/use-loots-filters";
import {
  getLootQueryParams,
  lootListInfiniteQueryOptions,
} from "@/features/guild/loots-list/components/loots-list/loot-list-query";
import {
  getOrganizationLandingItemId,
  type AppNavigationItemId,
} from "@/navigation/app-navigation";

// Sections a member can land on when the loot list is not theirs to read.
const LANDING_ROUTES = {
  "organization-timers": "/$guildId/timers",
  "organization-hero-sightings": "/$guildId/hero-sightings",
  "organization-reservations": "/$guildId/reservations",
  "organization-docs": "/$guildId/docs",
  "organization-events": "/$guildId/events",
  "organization-stats": "/$guildId/stats",
  "organization-activity": "/$guildId/activity-logs",
  "organization-notifications": "/$guildId/notifications",
  "organization-settings": "/$guildId/settings",
} as const satisfies Partial<Record<AppNavigationItemId, string>>;

const isLandingRoute = (
  itemId: AppNavigationItemId,
): itemId is keyof typeof LANDING_ROUTES => itemId in LANDING_ROUTES;

export const Route = createFileRoute("/_authenticated/$guildId/")({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.breadcrumbs.lootsList") }),
  },
  component: LootsListPage,
  pendingComponent: LootsListPageSkeleton,
  // The server rail opens every Organization here, so this page holds the
  // previous one as long as the Organization route does.
  pendingMs: ORGANIZATION_OPEN_PENDING_MS,
  loader: async ({ abortController, context, location, params }) => {
    // The parent route ensures the same query, so this is a cache read.
    const permissions = await withRouteLoaderCancellation(abortController, () =>
      ensureRouteQueryData(
        context.queryClient,
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
        ),
      ),
    );

    const landingItemId = getOrganizationLandingItemId(
      params.guildId,
      createAccessPolicy({ capabilities: permissions }),
    );

    if (landingItemId && isLandingRoute(landingItemId)) {
      throw redirect({
        to: LANDING_ROUTES[landingItemId],
        params: { guildId: params.guildId },
      });
    }

    await settleRoutePrefetches([
      prefetchRouteInfiniteQuery(
        context.queryClient,
        lootListInfiniteQueryOptions(
          params.guildId,
          getLootQueryParams(
            loadLootsFilters(location.searchStr),
            readGuildWorld(params.guildId, location.searchStr),
          ),
        ),
      ),
    ]);
  },
});
