import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogs } from "@/features/guild/activity-logs/activity-logs";
import { ActivityLogsPageSkeleton } from "@/features/guild/activity-logs/activity-logs-page-skeleton";
import {
  activityLogsInfiniteQueryOptions,
  getActivityLogSources,
  getActivityLogTypes,
} from "@/features/guild/activity-logs/activity-logs.queries";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteInfiniteQuery } from "@/lib/router/route-prefetch";
import {
  GUILD_WORLD_SEARCH_PARAM,
  readStoredGuildWorld,
} from "@/hooks/context/use-guild-world";

const getSearchParamValues = (searchParams: URLSearchParams, key: string) => {
  const values = searchParams.getAll(key).filter(Boolean);

  return values.length > 0 ? values : undefined;
};

export const Route = createFileRoute("/_authenticated/$guildId/activity-logs")({
  loader: ({ abortController, context, location, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      const searchParams = new URLSearchParams(location.searchStr);
      const startDate = searchParams.get("startDate") || undefined;
      const endDate = searchParams.get("endDate") || undefined;
      const name = searchParams.get("name") || undefined;
      const clanName = searchParams.get("clanName") || undefined;

      // The page shows the Organization's world, which a link may carry.
      const world =
        searchParams.get(GUILD_WORLD_SEARCH_PARAM) ||
        readStoredGuildWorld(params.guildId) ||
        undefined;

      void prefetchRouteInfiniteQuery(
        context.queryClient,
        activityLogsInfiniteQueryOptions({
          guildId: params.guildId,
          types: getActivityLogTypes(
            getSearchParamValues(searchParams, "types") ?? [],
          ),
          sources: getActivityLogSources(
            getSearchParamValues(searchParams, "sources") ?? [],
          ),
          startDate,
          endDate,
          name,
          clanName,
          world,
          limit: 20,
        }),
      ).catch(() => undefined);

      return null;
    }),
  component: ActivityLogs,
  pendingComponent: ActivityLogsPageSkeleton,
});
