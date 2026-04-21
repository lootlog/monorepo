import { getTimersControllerGetAllTimersQueryKey } from "@/lib/api/generated/main/timers/timers";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@/lib/api/generated/main/users/users";

export const queryKeys = {
  guilds: () => getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
  timers: (world?: string) =>
    getTimersControllerGetAllTimersQueryKey({ world }),
  allTimers: () => getTimersControllerGetAllTimersQueryKey(),
};
