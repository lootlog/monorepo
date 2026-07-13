import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useEffect } from "react";
import { partyReadyRoomControllerList } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import { useGlobalStore } from "@/store/global.store";
import { usePartyFinderStore } from "@/store/party-finder.store";

export function usePartyReadyRoomSync(): void {
  const joined = useGlobalStore((state) => state.socketState.joined);
  const mergeProjections = usePartyFinderStore(
    (state) => state.mergeProjections,
  );

  useEffect(() => {
    if (!joined) return;
    let cancelled = false;

    void partyReadyRoomControllerList()
      .then((projections) => {
        if (!cancelled) {
          mergeProjections(
            projections as unknown as PartyReadyRoomProjection[],
          );
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to synchronize party Ready Rooms", error);
      });

    return () => {
      cancelled = true;
    };
  }, [joined, mergeProjections]);
}
