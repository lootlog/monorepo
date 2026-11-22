import {
  decodePartyReadyRoomProjection,
  type PartyReadyRoomClientUpdate,
  type PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import { partyReadyRoomControllerGet } from "@lootlog/client/main";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryClient as gameQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import {
  applyReadyRoomUpdate,
  EMPTY_READY_ROOM_CACHE,
  mergeReadyRoomProjection,
  removeReadyRoom,
  type ReadyRoomCache,
  type ReadyRoomProjections,
} from "@/features/party-finder/ready-room-cache";

const writeReadyRoomCache = (
  client: QueryClient,
  update: (cache: ReadyRoomProjections) => ReadyRoomProjections,
) => {
  client.setQueryData<ReadyRoomCache>(queryKeys.readyRooms(), (cache) => {
    const current = cache ?? EMPTY_READY_ROOM_CACHE;

    return { ...current, ...update(current) };
  });
};

export const mergeReadyRoomProjectionIntoCache = (
  projection: PartyReadyRoomProjection,
  client: QueryClient = gameQueryClient,
) => {
  writeReadyRoomCache(client, (cache) =>
    mergeReadyRoomProjection(cache, projection),
  );
};

const applyReadyRoomUpdateToCache = (
  update: PartyReadyRoomClientUpdate,
  client: QueryClient = gameQueryClient,
) => {
  writeReadyRoomCache(client, (cache) => applyReadyRoomUpdate(cache, update));
};

const removeReadyRoomFromCache = (
  notificationId: string,
  client: QueryClient = gameQueryClient,
) => {
  writeReadyRoomCache(client, (cache) =>
    removeReadyRoom(cache, notificationId),
  );
};

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

export const useRefreshReadyRoom = () => {
  const { mergeProjection } = useReadyRoomsCache();

  return async (notificationId: string) => {
    const projection = decodePartyReadyRoomProjection(
      await partyReadyRoomControllerGet({ notificationId }),
    );

    mergeProjection(projection);

    return projection;
  };
};
