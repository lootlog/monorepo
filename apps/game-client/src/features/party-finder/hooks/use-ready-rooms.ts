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
import { useGameStore } from "@/store/game.store";

export const readReadyRoomCache = (
  client: QueryClient = gameQueryClient,
): ReadyRoomCache =>
  client.getQueryData<ReadyRoomCache>(queryKeys.readyRooms()) ??
  EMPTY_READY_ROOM_CACHE;

/**
 * True once a list response has been applied and no resynchronization is
 * pending, so callers never act on a collection that may be incomplete. A
 * collection loaded before the gateway dropped does not count either: updates
 * missed while disconnected are only recovered by the next list.
 */
export const areReadyRoomsSynchronized = (
  client: QueryClient = gameQueryClient,
): boolean =>
  useGlobalStore.getState().socketState.joined &&
  readReadyRoomCache(client).listAppliedAt !== null;

/**
 * Marks the collection as awaiting a list response. Called before every
 * resynchronization so a socket update arriving while the request is in
 * flight, or after it failed, cannot present the collection as current.
 */
export const invalidateReadyRoomSync = (client: QueryClient): void => {
  client.setQueryData<ReadyRoomCache>(queryKeys.readyRooms(), (cache) =>
    cache ? { ...cache, listAppliedAt: null } : cache,
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
export const useReadyRooms = <TData = ReadyRoomCache>(
  select?: (cache: ReadyRoomCache) => TData,
) => {
  const queryClient = useQueryClient();
  const joined = useGlobalStore((state) => state.socketState.joined);

  return useQuery({
    queryKey: queryKeys.readyRooms(),
    enabled: joined,
    select,
    // A collection that has never had a list applied, or whose sync was
    // invalidated, must be fetched; once a list lands only an explicit
    // resynchronization refetches it.
    staleTime: () =>
      readReadyRoomCache(queryClient).listAppliedAt === null ? 0 : Infinity,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const baseline = captureReadyRoomSyncBaseline(
        readReadyRoomCache(queryClient),
      );

      const projections = await partyReadyRoomControllerList({ signal });

      return {
        ...applyAuthoritativeReadyRoomSync(
          readReadyRoomCache(queryClient),
          decodeProjections(projections),
          baseline,
        ),
        listAppliedAt: Date.now(),
      };
    },
  });
};

const selectSynchronized = (cache: ReadyRoomCache) =>
  cache.listAppliedAt !== null;

const selectProjections = (cache: ReadyRoomCache) => cache.projections;

const selectHasOwnedRoom = (cache: ReadyRoomCache) =>
  selectOwnedReadyRoom(cache) !== null;

export const useReadyRoomsSynchronized = (): boolean => {
  const joined = useGlobalStore((state) => state.socketState.joined);
  const { data: synchronized = false } = useReadyRooms(selectSynchronized);

  return joined && synchronized;
};

export const useReadyRoomProjections = () =>
  useReadyRooms(selectProjections).data ?? EMPTY_READY_ROOM_CACHE.projections;

export const useOwnedReadyRoom = () =>
  useReadyRooms(selectOwnedReadyRoom).data ?? null;

export const useHasOwnedReadyRoom = () =>
  useReadyRooms(selectHasOwnedRoom).data ?? false;

/** The room the current character organizes or participates in. */
export const useCurrentCharacterReadyRoom = () => {
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);

  return (
    useReadyRooms(
      (cache) =>
        selectOwnedReadyRoom(cache) ??
        selectReadyRoomForCharacter(
          cache,
          accountId !== undefined && characterId !== undefined
            ? { accountId, characterId }
            : null,
        ),
    ).data ?? null
  );
};
