import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { useSocket } from "@/contexts/socket-context";
import { GatewayEvent } from "@/config/gateway";
import { queryKeys } from "@/features/public-api/query-keys";
import {
  EMPTY_READY_ROOM_CACHE,
  resetReadyRoomObservationSequence,
} from "@/features/party-finder/ready-room-cache";
import {
  invalidateReadyRoomSync,
  useReadyRoomsSynchronized,
} from "@/features/party-finder/hooks/use-ready-rooms";

/**
 * Mounts the Ready Room query and resynchronizes it whenever the viewer's
 * character, world or guild permissions change. A permission change can hide
 * rooms the viewer may no longer see, so it drops the collection instead of
 * merging the next response into it.
 */
export function usePartyReadyRoomSync(): void {
  const queryClient = useQueryClient();
  const world = useGameStore((state) => state.game?.world);
  const characterId = useGameStore((state) => state.game?.hero.characterId);
  const joined = useGlobalStore((state) => state.socketState.joined);
  const { socket } = useSocket();

  useReadyRoomsSynchronized();

  const wasJoined = useRef(joined);
  const lastIdentity = useRef(`${world ?? ""}:${characterId ?? ""}`);

  // Every gateway join and character switch resynchronizes: updates missed
  // while disconnected are only recovered by a fresh list, never by the
  // cached collection. Mounting the query already fetches it, so the first
  // render needs no invalidation of its own.
  useEffect(() => {
    const identity = `${world ?? ""}:${characterId ?? ""}`;
    const rejoined = joined && !wasJoined.current;
    const identityChanged = identity !== lastIdentity.current;
    wasJoined.current = joined;
    lastIdentity.current = identity;

    if (!joined || (!rejoined && !identityChanged)) return;

    invalidateReadyRoomSync(queryClient);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.readyRooms(),
      exact: true,
    });
  }, [queryClient, world, characterId, joined]);

  useEffect(() => {
    if (!socket) return;

    const permissionsChanged = () => {
      resetReadyRoomObservationSequence();
      queryClient.setQueryData(queryKeys.readyRooms(), EMPTY_READY_ROOM_CACHE);
      invalidateReadyRoomSync(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.readyRooms(),
        exact: true,
      });
    };

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, permissionsChanged);
    };
  }, [queryClient, socket]);
}
