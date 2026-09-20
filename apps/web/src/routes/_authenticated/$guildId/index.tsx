import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@lootlog/client/main";
import { LootsListPage } from "@/features/guild/loots-list/loots-list";
import { LootsListPageSkeleton } from "@/features/guild/loots-list/loots-list-page-skeleton";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";
import {
  getOrganizationLandingItemId,
  type AppNavigationItemId,
} from "@/navigation/app-navigation";

// Sections a member can land on when the loot list is not theirs to read.
const LANDING_ROUTES = {
  "organization-timers": "/$guildId/timers",
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
  component: LootsListPage,
  pendingComponent: LootsListPageSkeleton,
  loader: async ({ context, params }) => {
    // The parent route ensures the same query, so this is a cache read.
    const permissions = await ensureRouteQueryData(
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
  },
});
