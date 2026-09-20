import type {
  PartyReadyRoomClientUpdate,
  PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryClient as gameQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/features/public-api/query-keys";
import {
  applyReadyRoomUpdate,
  EMPTY_READY_ROOM_CACHE,
  mergeReadyRoomProjection,
  removeReadyRoom,
  type ReadyRoomCache,
} from "@/features/party-finder/ready-room-cache";

const writeReadyRoomCache = (
  client: QueryClient,
  update: (cache: ReadyRoomCache) => ReadyRoomCache,
) => {
  client.setQueryData<ReadyRoomCache>(queryKeys.readyRooms(), (cache) =>
    update(cache ?? EMPTY_READY_ROOM_CACHE),
  );
};

export const mergeReadyRoomProjectionIntoCache = (
  projection: PartyReadyRoomProjection,
  client: QueryClient = gameQueryClient,
) => {
  writeReadyRoomCache(client, (cache) =>
    mergeReadyRoomProjection(cache, projection),
  );
};

export const applyReadyRoomUpdateToCache = (
  update: PartyReadyRoomClientUpdate,
  client: QueryClient = gameQueryClient,
) => {
  writeReadyRoomCache(client, (cache) => applyReadyRoomUpdate(cache, update));
};

export const removeReadyRoomFromCache = (
  notificationId: string,
  client: QueryClient = gameQueryClient,
) => {
  writeReadyRoomCache(client, (cache) =>
    removeReadyRoom(cache, notificationId),
  );
};

/**
 * The Ready Room counterpart of useTimersCache: every source of a newer
 * projection — socket updates, mutation responses, expiry rechecks — writes
 * through here instead of keeping its own copy.
 */
export const useReadyRoomsCache = () => {
  const queryClient = useQueryClient();

  return {
    mergeProjection: (projection: PartyReadyRoomProjection) =>
      mergeReadyRoomProjectionIntoCache(projection, queryClient),
    applyUpdate: (update: PartyReadyRoomClientUpdate) =>
      applyReadyRoomUpdateToCache(update, queryClient),
    removeProjection: (notificationId: string) =>
      removeReadyRoomFromCache(notificationId, queryClient),
  };
};
