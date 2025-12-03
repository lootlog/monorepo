import { useActivityApiClient } from "@/hooks/api/activity-logs/use-activity-log-api-client";
import { useInfiniteQuery } from "@tanstack/react-query";

export type ActivityType = "CONNECT_EVENT" | "DISCONNECT_EVENT";
export type ActivitySource = "GAME" | "WEB_APP";

export type ActivityActorSnapshot = {
  id: string;
  accountId: number;
  characterId: number;
  clanName: string;
  clanId?: number;
  icon: string;
  lvl: number;
  name: string;
  prof: string;
  source: ActivitySource;
  createdAt: string;
  world?: string;
};

export type ActivityLog = {
  id: string;
  userId: string;
  guildId: string;
  discordId: string;
  type: ActivityType;
  source: ActivitySource;
  world?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  actorSnapshot?: ActivityActorSnapshot;
};

export type PaginatedActivitiesResponse = {
  data: ActivityLog[];
  nextCursor?: string;
  hasMore: boolean;
};

export type UseActivityLogsOptions = {
  guildId?: string;
  types?: ActivityType[];
  sources?: ActivitySource[];
  startDate?: string;
  endDate?: string;
  name?: string;
  world?: string;
  limit?: number;
};

export const useActivityLogs = (options: UseActivityLogsOptions) => {
  const { client } = useActivityApiClient();
  const {
    guildId,
    types,
    sources,
    startDate,
    endDate,
    name,
    world,
    limit = 20,
  } = options;

  const queryParams = new URLSearchParams();
  if (types && types.length > 0) {
    types.forEach((type) => queryParams.append("type", type));
  }
  if (sources && sources.length > 0) {
    sources.forEach((source) => queryParams.append("source", source));
  }
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);
  if (name) queryParams.append("name", name);
  if (world) queryParams.append("world", world);
  queryParams.append("limit", limit.toString());

  const queryString = queryParams.toString();

  const query = useInfiniteQuery({
    queryKey: ["activity-logs", guildId, queryString],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam ? `&cursor=${pageParam}` : "";

      return client.get<PaginatedActivitiesResponse>(
        `/guilds/${guildId}/activity-logs?${queryString}${cursor}`,
      );
    },
    enabled: !!guildId,
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (!lastPage?.data) return undefined;
      return lastPage.data.hasMore ? lastPage.data.nextCursor : undefined;
    },
  });

  return query;
};
