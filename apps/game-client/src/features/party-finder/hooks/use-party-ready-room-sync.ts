import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useEffect } from "react";
import { partyReadyRoomControllerList } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import { useGlobalStore } from "@/store/global.store";
import {
  captureReadyRoomSyncBaseline,
  usePartyFinderStore,
} from "@/store/party-finder.store";

export function usePartyReadyRoomSync(): void {
  const joined = useGlobalStore((state) => state.socketState.joined);
  const applyAuthoritativeSync = usePartyFinderStore(
    (state) => state.applyAuthoritativeSync,
  );
  const setReadyRoomsSynchronized = usePartyFinderStore(
    (state) => state.setReadyRoomsSynchronized,
  );

  useEffect(() => {
    if (!joined) {
      setReadyRoomsSynchronized(false);
      return;
    }
    let cancelled = false;
    const baseline = captureReadyRoomSyncBaseline(
      usePartyFinderStore.getState(),
    );
    setReadyRoomsSynchronized(false);

    void partyReadyRoomControllerList()
      .then((projections) => {
        if (!cancelled) {
          applyAuthoritativeSync(
            projections as unknown as PartyReadyRoomProjection[],
            baseline,
          );
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to synchronize party Ready Rooms", error);
      });

    return () => {
      cancelled = true;
    };
  }, [joined, applyAuthoritativeSync, setReadyRoomsSynchronized]);
}
