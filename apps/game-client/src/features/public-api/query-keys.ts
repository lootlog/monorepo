import {
  getHeroSightingsControllerGetAllHeroSightingsQueryKey,
  getPartyReadyRoomControllerListQueryKey,
  getTimersControllerGetAllTimersQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
} from "@lootlog/client/main";

export const queryKeys = {
  guilds: () => getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
  timers: (world?: string) =>
    getTimersControllerGetAllTimersQueryKey({ world }),
  allTimers: () => getTimersControllerGetAllTimersQueryKey(),
  heroSightings: (world: string) =>
    getHeroSightingsControllerGetAllHeroSightingsQueryKey({ world }),
  allHeroSightings: () =>
    getHeroSightingsControllerGetAllHeroSightingsQueryKey(),
  readyRooms: () => getPartyReadyRoomControllerListQueryKey(),
};
