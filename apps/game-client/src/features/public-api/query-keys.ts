import { getTimersControllerGetAllTimersQueryKey } from "@lootlog/api-client/react-query/main/timers";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/api-client/react-query/main/users";

export const queryKeys = {
  guilds: () => getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
  timers: (world?: string) =>
    getTimersControllerGetAllTimersQueryKey({ world }),
  allTimers: () => getTimersControllerGetAllTimersQueryKey(),
};
