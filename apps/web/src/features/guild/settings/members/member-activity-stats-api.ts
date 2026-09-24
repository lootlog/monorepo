import { queryOptions } from "@tanstack/react-query";
import { createApiClient } from "@lootlog/client/transport";

export type MemberActivityStats = {
  guildId: string;
  discordId: string;
  source: "GAME" | "WEB_APP";
  lastSeenAt?: string | null;
  visitCount: number;
  activeSessionCount: number;
  createdAt: string;
  updatedAt: string;
};

export const getMemberActivityStatsQueryKey = (guildId: string) => [
  "activity",
  "guilds",
  guildId,
  "member-activity-stats",
];

const activityApiClient = createApiClient("activity");

export const fetchMemberActivityStats = (
  guildId: string,
  signal?: AbortSignal,
) =>
  activityApiClient.get<MemberActivityStats[]>(
    `/guilds/${guildId}/member-activity-stats`,
    { signal },
  );

export const memberActivityStatsQueryOptions = (guildId: string | undefined) =>
  queryOptions({
    queryKey: getMemberActivityStatsQueryKey(guildId ?? ""),
    queryFn: ({ signal }) => fetchMemberActivityStats(guildId ?? "", signal),
    enabled: Boolean(guildId),
  });
