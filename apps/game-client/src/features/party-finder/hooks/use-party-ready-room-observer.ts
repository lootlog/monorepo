import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useEffect, useRef } from "react";
import { partyReadyRoomControllerObserveParty } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { useGlobalStore } from "@/store/global.store";

export function usePartyReadyRoomObserver(): void {
  const ownedReadyRoom = usePartyFinderStore(selectOwnedReadyRoom);
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const readyRoomsSynchronized = usePartyFinderStore(
    (state) => state.readyRoomsSynchronized,
  );
  const { connected, joined } = useGlobalStore((state) => state.socketState);
  const partyMembers = usePartyStore((state) => state.members);
  const lastReportedSnapshot = useRef<string | null>(null);

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
      !isOrganizingCharacter
    ) {
      lastReportedSnapshot.current = null;
      return;
    }

    const memberCharacterIds = [
      ...new Set(partyMembers.map(({ id }) => String(id))),
    ].sort();
    const snapshot = `${ownedReadyRoom.notificationId}:${memberCharacterIds.join(",")}`;
    if (lastReportedSnapshot.current === snapshot) return;
    lastReportedSnapshot.current = snapshot;

    void partyReadyRoomControllerObserveParty(
      { notificationId: ownedReadyRoom.notificationId },
      { memberCharacterIds },
    )
      .then((projection) => {
        mergeProjection(projection as unknown as PartyReadyRoomProjection);
      })
      .catch((error: unknown) => {
        console.warn("Failed to report the observed party snapshot", error);
      });
  }, [
    ownedReadyRoom,
    partyMembers,
    mergeProjection,
    connected,
    joined,
    readyRoomsSynchronized,
  ]);
}
