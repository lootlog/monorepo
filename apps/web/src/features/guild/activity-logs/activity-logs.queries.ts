import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  activitiesControllerFindByGuild,
  getActivitiesControllerFindByGuildQueryKey,
  ActivitiesControllerFindByGuildSourceItem,
  ActivitiesControllerFindByGuildTypeItem,
  type ActivitiesControllerFindByGuildParams,
  type ActivitiesControllerFindByGuildSourceItem as ActivitySource,
  type ActivitiesControllerFindByGuildTypeItem as ActivityType,
} from "@lootlog/client/activity";

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
  activityLogTypeValues.some((type) => type === value);

const isActivityLogSource = (value: string): value is ActivitySource =>
  activityLogSourceValues.some((source) => source === value);

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
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      activitiesControllerFindByGuild(
        { guildId: guildId ?? "" },
        {
          ...baseParams,
          cursor: pageParam,
        },
      ),
    enabled: Boolean(guildId),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
};
