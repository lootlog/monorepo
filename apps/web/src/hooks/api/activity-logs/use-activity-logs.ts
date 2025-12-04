import { useActivityApiClient } from "@/hooks/api/activity-logs/use-activity-log-api-client";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  createSerializer,
  parseAsInteger,
  parseAsNativeArrayOf,
  parseAsString,
} from "nuqs";

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

export type ActivityLootContext = {
  id: string;
  lootId: number;
  actorSnapshot: ActivityActorSnapshot;
};

export type ActivityTimerContext = {
  id: string;
  npcName: string;
  actorSnapshot: ActivityActorSnapshot;
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
  lootContext?: ActivityLootContext;
  timerContext?: ActivityTimerContext;
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
  clanName?: string;
  world?: string;
  limit?: number;
  name?: string;
};

const serializeActivityLogsQuery = createSerializer({
  type: parseAsNativeArrayOf(parseAsString),
  source: parseAsNativeArrayOf(parseAsString),
  startDate: parseAsString,
  endDate: parseAsString,
  playerName: parseAsString,
  clanName: parseAsString,
  world: parseAsString,
  limit: parseAsInteger,
  cursor: parseAsString,
});

export const useActivityLogs = (options: UseActivityLogsOptions) => {
  const { client } = useActivityApiClient();
  const {
    guildId,
    types,
    sources,
    startDate,
    endDate,
    clanName,
    world,
    limit = 20,
    name,
  } = options;

  const buildQueryString = (cursor?: string) =>
    serializeActivityLogsQuery({
      type: types?.length ? types : null,
      source: sources?.length ? sources : null,
      startDate: startDate || null,
      endDate: endDate || null,
      playerName: name || null,
      clanName: clanName || null,
      world: world || null,
      limit,
      cursor: cursor || null,
    });

  const baseQueryString = buildQueryString();

  const query = useInfiniteQuery({
    queryKey: ["activity-logs", guildId, baseQueryString],
    queryFn: ({ pageParam }) => {
      const queryString = buildQueryString(
        pageParam ? (pageParam as string) : undefined,
      );

      return client.get<PaginatedActivitiesResponse>(
        `/guilds/${guildId}/activity-logs${queryString}`,
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
