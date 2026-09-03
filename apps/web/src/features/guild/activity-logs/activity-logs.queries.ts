import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  activitiesControllerFindByGuild,
  getActivitiesControllerFindByGuildQueryKey,
} from "@lootlog/client/activity";
import { ActivitiesControllerFindByGuildSourceItem } from "@lootlog/client/activity";
import { ActivitiesControllerFindByGuildTypeItem } from "@lootlog/client/activity";
import type { ActivitiesControllerFindByGuildParams } from "@lootlog/client/activity";
import type { ActivitiesControllerFindByGuildSourceItem as ActivitySource } from "@lootlog/client/activity";
import type { ActivitiesControllerFindByGuildTypeItem as ActivityType } from "@lootlog/client/activity";

export type ActivityLogsQueryOptions = {
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

const activityLogTypeValues = Object.values(
  ActivitiesControllerFindByGuildTypeItem,
);

const activityLogSourceValues = Object.values(
  ActivitiesControllerFindByGuildSourceItem,
);

const isActivityLogType = (value: string): value is ActivityType =>
  activityLogTypeValues.includes(value as ActivityType);

const isActivityLogSource = (value: string): value is ActivitySource =>
  activityLogSourceValues.includes(value as ActivitySource);

export const getActivityLogTypes = (values: string[]): ActivityType[] =>
  values.filter(isActivityLogType);

export const getActivityLogSources = (values: string[]): ActivitySource[] =>
  values.filter(isActivityLogSource);

const createActivityLogsQueryParams = ({
  types,
  sources,
  startDate,
  endDate,
  clanName,
  world,
  limit = 20,
  name,
}: Omit<
  ActivityLogsQueryOptions,
  "guildId"
>): ActivitiesControllerFindByGuildParams => ({
  type: types?.length ? types : undefined,
  source: sources?.length ? sources : undefined,
  startDate: startDate || undefined,
  endDate: endDate || undefined,
  playerName: name || undefined,
  clanName: clanName || undefined,
  world: world || undefined,
  limit,
});

export const activityLogsInfiniteQueryOptions = ({
  guildId,
  ...options
}: ActivityLogsQueryOptions) => {
  const baseParams = createActivityLogsQueryParams(options);

  return infiniteQueryOptions({
    queryKey: getActivitiesControllerFindByGuildQueryKey(
      { guildId: guildId ?? "" },
      baseParams,
    ),
    queryFn: ({ pageParam }) =>
      activitiesControllerFindByGuild(
        { guildId: guildId ?? "" },
        {
          ...baseParams,
          cursor: typeof pageParam === "string" ? pageParam : undefined,
        },
      ),
    enabled: Boolean(guildId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
};
