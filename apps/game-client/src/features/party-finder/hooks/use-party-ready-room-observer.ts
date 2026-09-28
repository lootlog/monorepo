import {
  decodePartyReadyRoomProjection,
  type PartyGatheringPartyMember,
} from "@lootlog/schema/party-ready-room";
import { useEffect, useEffectEvent, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { partyReadyRoomControllerObserveParty } from "@lootlog/client/main";
import { usePartyStore } from "@/store/party.store";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { useGlobalStore } from "@/store/global.store";
import {
  useOwnedReadyRoom,
  useReadyRoomsSynchronized,
} from "@/features/party-finder/hooks/use-ready-rooms";
import { useReadyRoomsCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";

type ObservePartyVariables = {
  notificationId: string;
  memberCharacterIds: string[];
  members: PartyGatheringPartyMember[];
  organizerAccountId: string;
  organizerCharacterId: string;
};

export function usePartyReadyRoomObserver(): void {
  const ownedReadyRoom = useOwnedReadyRoom();
  const readyRoomsSynchronized = useReadyRoomsSynchronized();
  const { mergeProjection } = useReadyRoomsCache();
  const { connected, joined } = useGlobalStore((state) => state.socketState);
  const partyMembers = usePartyStore((state) => state.members);
  const partyStatus = usePartyStore((state) => state.status);
  const lastReportedSnapshot = useRef<string | null>(null);

  const { mutate: observeParty } = useMutation({
    mutationFn: ({ notificationId, ...body }: ObservePartyVariables) =>
      partyReadyRoomControllerObserveParty({ notificationId }, body),
    onSuccess: (projection) => {
      mergeProjection(decodePartyReadyRoomProjection(projection));
    },
    onError: (cause) => {
      console.warn("Failed to report the observed party snapshot", cause);
    },
  });

  const reportSnapshot = useEffectEvent((variables: ObservePartyVariables) => {
    observeParty(variables);
  });

  useEffect(() => {
    const currentCharacter = getCurrentReadyRoomCharacterIdentity();

    const isOrganizingCharacter =
      currentCharacter !== null &&
      currentCharacter.accountId ===
        ownedReadyRoom?.organizerCharacter.accountId &&
      currentCharacter.characterId ===
        ownedReadyRoom?.organizerCharacter.characterId;

    if (
      !ownedReadyRoom ||
      !connected ||
      !joined ||
      !readyRoomsSynchronized ||
      partyStatus !== "ready" ||
      !isOrganizingCharacter
    ) {
      lastReportedSnapshot.current = null;

      return;
    }

    const memberCharacterIds = [
      ...new Set(partyMembers.map(({ characterId }) => characterId)),
    ].sort();

    const members = memberCharacterIds.flatMap((characterId) => {
      const member = partyMembers.find(
        (entry) => entry.characterId === characterId,
      );

      if (!member) return [];

      return [
        {
          characterId,
          nick: member.name,
          icon: member.icon,
          prof: member.profession ?? undefined,
        },
      ];
    });

    const snapshot = JSON.stringify([ownedReadyRoom.notificationId, members]);

    if (lastReportedSnapshot.current === snapshot) return;
    lastReportedSnapshot.current = snapshot;

    reportSnapshot({
      notificationId: ownedReadyRoom.notificationId,
      memberCharacterIds,
      members,
      organizerAccountId: ownedReadyRoom.organizerCharacter.accountId,
      organizerCharacterId: ownedReadyRoom.organizerCharacter.characterId,
    });
  }, [
    ownedReadyRoom,
    partyMembers,
    partyStatus,
    connected,
    joined,
    readyRoomsSynchronized,
  ]);
}
