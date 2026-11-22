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
import { queryKeys } from "@/lib/query-keys";
import { useGlobalStore } from "@/store/global.store";
import {
  applyAuthoritativeReadyRoomSync,
  captureReadyRoomSyncBaseline,
  characterIdentitiesMatch,
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

export const areReadyRoomsSynchronized = (
  client: QueryClient = gameQueryClient,
): boolean =>
  useGlobalStore.getState().socketState.joined &&
  readReadyRoomCache(client).listAppliedAt !== null;

export const invalidateReadyRoomSync = (client: QueryClient): void => {
  client.setQueryData<ReadyRoomCache>(queryKeys.readyRooms(), (cache) =>
    cache ? { ...cache, listAppliedAt: null } : cache,
  );
};

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

export const useReadyRooms = <TData = ReadyRoomCache>(
  select?: (cache: ReadyRoomCache) => TData,
) => {
  const queryClient = useQueryClient();
  const joined = useGlobalStore((state) => state.socketState.joined);

  return useQuery({
    queryKey: queryKeys.readyRooms(),
    enabled: joined,
    select,
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

export const useAccountOwnedReadyRoom = () => {
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const room = useOwnedReadyRoom();

  return room?.organizerCharacter.accountId === accountId ? room : null;
};

export const useHasOwnedReadyRoom = () =>
  useReadyRooms(selectHasOwnedRoom).data ?? false;

export const useCurrentCharacterReadyRoom = () => {
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);

  const identity =
    accountId !== undefined && characterId !== undefined
      ? { accountId, characterId }
      : null;

  const room =
    useReadyRooms((cache) => selectReadyRoomForCharacter(cache, identity))
      .data ?? null;

  return {
    room,
    isOrganizer:
      room?.viewer === "ORGANIZER" &&
      characterIdentitiesMatch(identity, room.organizerCharacter),
  };
};
