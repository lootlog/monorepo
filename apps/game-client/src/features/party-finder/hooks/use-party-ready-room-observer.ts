import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useEffect, useRef } from "react";
import { partyReadyRoomControllerObserveParty } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";

export function usePartyReadyRoomObserver(): void {
  const ownedReadyRoom = usePartyFinderStore(selectOwnedReadyRoom);
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const partyMembers = usePartyStore((state) => state.members);
  const lastReportedSnapshot = useRef<string | null>(null);

  useEffect(() => {
    if (!ownedReadyRoom) {
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
  }, [ownedReadyRoom, partyMembers, mergeProjection]);
}
