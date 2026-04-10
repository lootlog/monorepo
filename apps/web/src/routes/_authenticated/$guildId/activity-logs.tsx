import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogs } from "@/features/activity-logs/activity-logs";
import { ActivityLogsPageSkeleton } from "@/features/activity-logs/activity-logs-page-skeleton";
import { activityLogsInfiniteQueryOptions } from "@/hooks/api/activity-logs/use-activity-logs";
import { activitySuggestionsQueryOptions } from "@/hooks/api/activity-logs/use-activity-suggestions";

const getSearchParamValues = (searchParams: URLSearchParams, key: string) => {
  const values = searchParams.getAll(key).filter(Boolean);
  return values.length > 0 ? values : undefined;
};

export const Route = createFileRoute("/_authenticated/$guildId/activity-logs")({
  loader: async ({ context, location, params }) => {
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
          types: getSearchParamValues(searchParams, "types") as
            | Array<"CONNECT_EVENT" | "DISCONNECT_EVENT">
            | undefined,
          sources: getSearchParamValues(searchParams, "sources") as
            | Array<"GAME" | "WEB_APP">
            | undefined,
          startDate,
          endDate,
          name,
          clanName,
          world,
          limit: 20,
          suppressRouteErrorToast: true,
        }),
      ),
      context.queryClient.ensureQueryData(
        activitySuggestionsQueryOptions({
          endpoint: "world-suggestions",
          guildId: params.guildId,
          limit: 20,
          requireSearch: false,
          suppressRouteErrorToast: true,
        }),
      ),
    ]);

    return null;
  },
  component: ActivityLogs,
  pendingComponent: ActivityLogsPageSkeleton,
});
