import {
  decodePartyReadyRoomProjection,
  type PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { partyReadyRoomControllerList } from "@lootlog/client/main";
import { queryClient as gameQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/features/public-api/query-keys";
import { useGlobalStore } from "@/store/global.store";
import {
  applyAuthoritativeReadyRoomSync,
  captureReadyRoomSyncBaseline,
  EMPTY_READY_ROOM_CACHE,
  resetReadyRoomObservationSequence,
  selectOwnedReadyRoom,
  selectReadyRoomForCharacter,
  type ReadyRoomCache,
} from "@/features/party-finder/ready-room-cache";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";

export const readReadyRoomCache = (
  client: QueryClient = gameQueryClient,
): ReadyRoomCache =>
  client.getQueryData<ReadyRoomCache>(queryKeys.readyRooms()) ??
  EMPTY_READY_ROOM_CACHE;

/**
 * True once a list response has been applied and no resynchronization is in
 * flight, so callers never act on a collection that is about to be replaced.
 * A collection loaded before the gateway dropped is not synchronized either:
 * updates missed while disconnected are only recovered by the next list.
 */
export const areReadyRoomsSynchronized = (
  client: QueryClient = gameQueryClient,
): boolean => {
  const state = client.getQueryState(queryKeys.readyRooms());

  return (
    useGlobalStore.getState().socketState.joined &&
    state?.status === "success" &&
    state.fetchStatus === "idle"
  );
};

/**
 * Drops every known room, used when leaving the game: the next synchronization
 * has to start from an empty collection rather than merge into a stale one.
 */
export const clearReadyRoomCache = (
  client: QueryClient = gameQueryClient,
): void => {
  resetReadyRoomObservationSequence();
  client.setQueryData<ReadyRoomCache>(
    queryKeys.readyRooms(),
    EMPTY_READY_ROOM_CACHE,
  );
};

const decodeProjections = (
  projections: Awaited<ReturnType<typeof partyReadyRoomControllerList>>,
): PartyReadyRoomProjection[] =>
  projections.flatMap((projection) =>
    projection.schemaVersion === 3
      ? [decodePartyReadyRoomProjection(projection)]
      : [],
  );

/**
 * Owns the Ready Room collection the way useTimers owns timers: the list
 * response is authoritative for the rooms already known when the request left,
 * and socket updates and mutation responses write into the same cache entry.
 * Every consumer calls this, so a Ready Room view loads its own data instead
 * of depending on another component being mounted first.
 */
export const useReadyRooms = () => {
  const queryClient = useQueryClient();
  const joined = useGlobalStore((state) => state.socketState.joined);

  return useQuery({
    queryKey: queryKeys.readyRooms(),
    enabled: joined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const baseline = captureReadyRoomSyncBaseline(
        readReadyRoomCache(queryClient),
      );

      const projections = await partyReadyRoomControllerList({ signal });

      return applyAuthoritativeReadyRoomSync(
        readReadyRoomCache(queryClient),
        decodeProjections(projections),
        baseline,
      );
    },
  });
};

export const useReadyRoomsSynchronized = (): boolean => {
  const joined = useGlobalStore((state) => state.socketState.joined);
  const { isSuccess, isFetching } = useReadyRooms();

  return joined && isSuccess && !isFetching;
};

export const useReadyRoomCache = (): ReadyRoomCache =>
  useReadyRooms().data ?? EMPTY_READY_ROOM_CACHE;

export const useOwnedReadyRoom = () =>
  selectOwnedReadyRoom(useReadyRoomCache());

/**
 * The room the current character acts in: the one it organizes, otherwise the
 * one it applied to.
 */
export const useCurrentCharacterReadyRoom = () => {
  const cache = useReadyRoomCache();

  return (
    selectOwnedReadyRoom(cache) ??
    selectReadyRoomForCharacter(cache, getCurrentReadyRoomCharacterIdentity())
  );
};
