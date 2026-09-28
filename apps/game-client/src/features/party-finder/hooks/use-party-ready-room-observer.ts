import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { usePartyStore } from "@/store/party.store";
import { useGameStore } from "@/store/game.store";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { useGlobalStore } from "@/store/global.store";
import {
  areReadyRoomsSynchronized,
  readReadyRoomCache,
  useOwnedReadyRoom,
  useReadyRoomsSynchronized,
} from "@/features/party-finder/hooks/use-ready-rooms";
import { mergeReadyRoomProjectionIntoCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";
import { selectOwnedReadyRoom } from "@/features/party-finder/ready-room-cache";
import {
  createReadyRoomPartyReporter,
  type ReadyRoomPartyObservation,
} from "@/features/party-finder/ready-room-party-reporter";

function readObservation(
  client: QueryClient,
): ReadyRoomPartyObservation | null {
  const room = selectOwnedReadyRoom(readReadyRoomCache(client));
  const currentCharacter = getCurrentReadyRoomCharacterIdentity();
  const { connected, joined } = useGlobalStore.getState().socketState;
  const { members, status } = usePartyStore.getState();

  if (
    !room ||
    !connected ||
    !joined ||
    !areReadyRoomsSynchronized(client) ||
    status !== "ready" ||
    currentCharacter?.accountId !== room.organizerCharacter.accountId ||
    currentCharacter.characterId !== room.organizerCharacter.characterId
  )
    return null;

  return {
    scope: JSON.stringify([
      room.notificationId,
      [...room.guildIds].sort(),
      room.world,
      room.organizerDiscordId,
      currentCharacter.accountId,
      currentCharacter.characterId,
      useGameStore.getState().game?.world,
    ]),
    notificationId: room.notificationId,
    body: {
      expectedRevision: room.revision,
      memberCharacterIds: [
        ...new Set(members.map(({ characterId }) => characterId)),
      ].sort(),
      organizerAccountId: currentCharacter.accountId,
      organizerCharacterId: currentCharacter.characterId,
    },
  };
}

export function usePartyReadyRoomObserver(): void {
  const queryClient = useQueryClient();
  const ownedReadyRoom = useOwnedReadyRoom();
  const readyRoomsSynchronized = useReadyRoomsSynchronized();
  const { connected, joined } = useGlobalStore((state) => state.socketState);
  const partyMembers = usePartyStore((state) => state.members);
  const partyStatus = usePartyStore((state) => state.status);
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);
  const world = useGameStore((state) => state.game?.world);

  const reporter = useRef<ReturnType<
    typeof createReadyRoomPartyReporter
  > | null>(null);

  useEffect(() => {
    const current = createReadyRoomPartyReporter(
      () => readObservation(queryClient),
      (projection) =>
        mergeReadyRoomProjectionIntoCache(projection, queryClient),
    );

    reporter.current = current;

    return () => {
      reporter.current = null;
      current.dispose();
    };
  }, [queryClient]);

  useEffect(() => {
    reporter.current?.flush();
  }, [
    queryClient,
    ownedReadyRoom,
    partyMembers,
    partyStatus,
    connected,
    joined,
    readyRoomsSynchronized,
    accountId,
    characterId,
    world,
  ]);
}
