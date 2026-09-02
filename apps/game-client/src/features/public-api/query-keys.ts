import {
  getTimersControllerGetAllTimersQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
} from "@lootlog/client/main";

export const queryKeys = {
  guilds: () => getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
  timers: (world?: string) =>
    getTimersControllerGetAllTimersQueryKey({ world }),
  allTimers: () => getTimersControllerGetAllTimersQueryKey(),
};
