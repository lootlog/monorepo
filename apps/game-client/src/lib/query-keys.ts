import { queryOptions } from "@tanstack/react-query";
import {
  getHeroSightingsControllerGetAllHeroSightingsQueryKey,
  getPartyReadyRoomControllerListQueryKey,
  getTimersControllerGetAllTimersQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  type UserCurrentGuildResponseDtoOutput,
} from "@lootlog/client/main";
import type { Timer } from "@/api/timers.api";

export const queryKeys = {
  guilds: () =>
    queryOptions<UserCurrentGuildResponseDtoOutput[]>({
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    }).queryKey,
  timers: (world?: string) =>
    queryOptions<Timer[]>({
      queryKey: getTimersControllerGetAllTimersQueryKey({ world }),
    }).queryKey,
  allTimers: () => getTimersControllerGetAllTimersQueryKey(),
  heroSightings: (world: string) =>
    getHeroSightingsControllerGetAllHeroSightingsQueryKey({ world }),
  allHeroSightings: () =>
    getHeroSightingsControllerGetAllHeroSightingsQueryKey(),
  readyRooms: () => getPartyReadyRoomControllerListQueryKey(),
};
