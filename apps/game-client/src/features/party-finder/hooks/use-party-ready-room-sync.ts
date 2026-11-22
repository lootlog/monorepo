import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { useSocket } from "@/contexts/socket-context";
import { queryKeys } from "@/lib/query-keys";
import { GATHERING_ACCESS_AREAS } from "@/features/chat/hooks/use-active-party-gatherings";
import type { AccessUpdate } from "@/lib/socket";
import {
  clearReadyRoomCache,
  invalidateReadyRoomSync,
  useReadyRoomsSynchronized,
} from "@/features/party-finder/hooks/use-ready-rooms";

export function usePartyReadyRoomSync(): void {
  const queryClient = useQueryClient();
  const world = useGameStore((state) => state.game?.world);
  const characterId = useGameStore((state) => state.game?.hero.characterId);
  const joined = useGlobalStore((state) => state.socketState.joined);
  const { socket } = useSocket();

  useReadyRoomsSynchronized();

  const wasJoined = useRef(joined);
  const hasJoined = useRef(joined);
  const lastIdentity = useRef(`${world ?? ""}:${characterId ?? ""}`);

  useEffect(() => {
    const identity = `${world ?? ""}:${characterId ?? ""}`;
    const rejoined = joined && !wasJoined.current && hasJoined.current;
    const identityChanged = identity !== lastIdentity.current;
    wasJoined.current = joined;
    lastIdentity.current = identity;

    if (joined) hasJoined.current = true;

    if (!joined || (!rejoined && !identityChanged)) return;

    invalidateReadyRoomSync(queryClient);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.readyRooms(),
      exact: true,
    });
  }, [queryClient, world, characterId, joined]);

  useEffect(() => {
    if (!socket) return;

    const permissionsChanged = ({ changes }: AccessUpdate) => {
      if (
        !changes.some((change) =>
          change.areas.some((area) => GATHERING_ACCESS_AREAS.has(area)),
        )
      )
        return;

      clearReadyRoomCache(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.readyRooms(),
        exact: true,
      });
    };

    socket.on("access.updated", permissionsChanged);

    return () => {
      socket.off("access.updated", permissionsChanged);
    };
  }, [queryClient, socket]);
}
