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

export const fetchMemberActivityStats = (guildId: string) =>
  activityApiClient.get<MemberActivityStats[]>(
    `/guilds/${guildId}/member-activity-stats`,
  );

export const memberActivityStatsQueryOptions = (guildId: string | undefined) =>
  queryOptions({
    queryKey: getMemberActivityStatsQueryKey(guildId ?? ""),
    queryFn: () => fetchMemberActivityStats(guildId ?? ""),
    enabled: Boolean(guildId),
  });
