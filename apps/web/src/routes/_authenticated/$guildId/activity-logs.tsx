import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogs } from "@/features/guild/activity-logs/activity-logs";
import { ActivityLogsPageSkeleton } from "@/features/guild/activity-logs/activity-logs-page-skeleton";
import { prefetchActivitiesControllerSuggestWorldsQuery } from "@/lib/api/generated/activity/guilds/guilds";
import {
  activityLogsInfiniteQueryOptions,
  getActivityLogSources,
  getActivityLogTypes,
} from "@/features/guild/activity-logs/activity-logs.queries";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

const getSearchParamValues = (searchParams: URLSearchParams, key: string) => {
  const values = searchParams.getAll(key).filter(Boolean);
  return values.length > 0 ? values : undefined;
};

export const Route = createFileRoute("/_authenticated/$guildId/activity-logs")({
  loader: ({ abortController, context, location, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const searchParams = new URLSearchParams(location.searchStr);
      const startDate = searchParams.get("startDate") || undefined;
      const endDate = searchParams.get("endDate") || undefined;
      const name = searchParams.get("name") || undefined;
      const clanName = searchParams.get("clanName") || undefined;
      const world = searchParams.get("world") || undefined;

      await Promise.all([
        context.queryClient.fetchInfiniteQuery(
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
        prefetchActivitiesControllerSuggestWorldsQuery(
          context.queryClient,
          { guildId: params.guildId },
          { limit: 20 },
        ),
      ]);

      return null;
    }),
  component: ActivityLogs,
  pendingComponent: ActivityLogsPageSkeleton,
});
