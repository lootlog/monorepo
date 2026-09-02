import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogs } from "@/features/guild/activity-logs/activity-logs";
import { ActivityLogsPageSkeleton } from "@/features/guild/activity-logs/activity-logs-page-skeleton";
import { getActivitiesControllerSuggestWorldsQueryOptions } from "@lootlog/client/activity";
import {
  activityLogsInfiniteQueryOptions,
  getActivityLogSources,
  getActivityLogTypes,
} from "@/features/guild/activity-logs/activity-logs.queries";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import {
  prefetchRouteInfiniteQuery,
  prefetchRouteQuery,
} from "@/lib/router/route-prefetch";

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
      const world = searchParams.get("world") || undefined;

      void Promise.all([
        prefetchRouteInfiniteQuery(
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
        ),
        prefetchRouteQuery(
          context.queryClient,
          getActivitiesControllerSuggestWorldsQueryOptions(
            { guildId: params.guildId },
            { limit: 20 },
          ),
        ),
      ]).catch(() => undefined);

      return null;
    }),
  component: ActivityLogs,
  pendingComponent: ActivityLogsPageSkeleton,
});
