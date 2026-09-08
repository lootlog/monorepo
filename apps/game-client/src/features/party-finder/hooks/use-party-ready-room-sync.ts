import {
  decodePartyReadyRoomProjection,
  type PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import { useEffect } from "react";
import { partyReadyRoomControllerList } from "@lootlog/client/main";
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
          const currentProjections: PartyReadyRoomProjection[] = [];
          for (const projection of projections) {
            if (projection.schemaVersion === 3) {
              currentProjections.push(
                decodePartyReadyRoomProjection(projection),
              );
            }
          }
          applyAuthoritativeSync(currentProjections, baseline);
        }
      })
      .catch((cause: unknown) => {
        console.warn("Failed to synchronize party Ready Rooms", cause);
      });

    return () => {
      cancelled = true;
    };
  }, [joined, applyAuthoritativeSync, setReadyRoomsSynchronized]);
}
