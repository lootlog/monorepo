import { decodePartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { useEffect } from "react";
import { partyReadyRoomControllerList } from "@lootlog/client/main";
import { useGlobalStore } from "@/store/global.store";
import { useSocket } from "@/contexts/socket-context";
import { useGameStore } from "@/store/game.store";
import { GatewayEvent } from "@/config/gateway";
import {
  captureReadyRoomSyncBaseline,
  usePartyFinderStore,
} from "@/store/party-finder.store";

export function usePartyReadyRoomSync(): void {
  const joined = useGlobalStore((state) => state.socketState.joined);
  const world = useGameStore((state) => state.game?.world);
  const characterId = useGameStore((state) => state.game?.hero.characterId);
  const { socket } = useSocket();
  const applyAuthoritativeSync = usePartyFinderStore(
    (state) => state.applyAuthoritativeSync,
  );
  const setReadyRoomsSynchronized = usePartyFinderStore(
    (state) => state.setReadyRoomsSynchronized,
  );
  useEffect(() => {
    setReadyRoomsSynchronized(false);
    if (!joined) return;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const synchronize = () => {
      controller?.abort();
      clearTimeout(timer);
      const request = new AbortController();
      controller = request;
      const baseline = captureReadyRoomSyncBaseline(
        usePartyFinderStore.getState(),
      );
      void partyReadyRoomControllerList({ signal: request.signal })
        .then((projections) => {
          if (disposed || request.signal.aborted) return;
          applyAuthoritativeSync(
            projections
              .filter((projection) => projection.schemaVersion === 3)
              .map((projection) => decodePartyReadyRoomProjection(projection)),
            baseline,
          );
        })
        .catch((cause: unknown) => {
          if (disposed || request.signal.aborted) return;
          setReadyRoomsSynchronized(false);
          console.warn("Failed to synchronize party Ready Rooms", cause);
        })
        .finally(() => {
          if (!disposed && !request.signal.aborted)
            timer = setTimeout(synchronize, 30_000);
        });
    };
    const permissionsChanged = () => {
      usePartyFinderStore.getState().clearReadyRooms();
      synchronize();
    };
    synchronize();
    socket?.on(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(timer);
      socket?.off(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);
    };
  }, [
    joined,
    world,
    characterId,
    socket,
    applyAuthoritativeSync,
    setReadyRoomsSynchronized,
  ]);
}
