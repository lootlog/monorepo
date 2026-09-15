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

    const synchronize = () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;

      const baseline = captureReadyRoomSyncBaseline(
        usePartyFinderStore.getState(),
      );

      void partyReadyRoomControllerList({ signal: request.signal })
        .then((projections) => {
          if (request.signal.aborted) return;
          applyAuthoritativeSync(
            projections.flatMap((projection) =>
              projection.schemaVersion === 3
                ? [decodePartyReadyRoomProjection(projection)]
                : [],
            ),
            baseline,
          );
        })
        .catch((cause: unknown) => {
          if (request.signal.aborted) return;
          setReadyRoomsSynchronized(false);
          console.warn("Failed to synchronize party Ready Rooms", cause);
        });
    };

    const permissionsChanged = () => {
      usePartyFinderStore.getState().clearReadyRooms();
      synchronize();
    };

    synchronize();
    socket?.on(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);

    return () => {
      controller?.abort();
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
