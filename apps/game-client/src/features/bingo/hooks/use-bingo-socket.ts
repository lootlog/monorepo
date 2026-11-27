import {
  getBingoControllerGetBoardQueryKey,
  getBingoControllerListBoardsQueryKey,
} from "@lootlog/client/main";
import { useSocket } from "@/contexts/socket-context";
import { useReconnectCatchUp } from "@/hooks/use-reconnect-catch-up";
import type { AppSocketEvents } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent } from "react";

export const useBingoSocket = (
  guildId: string | undefined,
  boardId?: string,
) => {
  const { socket, connected, joined } = useSocket();
  const queryClient = useQueryClient();

  const invalidate = (targetGuildId: string, targetBoardId?: string) => {
    void queryClient.invalidateQueries({
      queryKey: getBingoControllerListBoardsQueryKey({
        guildId: targetGuildId,
      }),
    });

    if (targetBoardId) {
      void queryClient.invalidateQueries({
        queryKey: getBingoControllerGetBoardQueryKey({
          guildId: targetGuildId,
          boardId: targetBoardId,
        }),
      });
    }
  };

  const handleUpdate = useEffectEvent(
    (payload: AppSocketEvents["bingo.updated"]) => {
      if (payload.guildId !== guildId) return;

      invalidate(payload.guildId, payload.boardId);
    },
  );

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- subscribes to gateway bingo.updated events while mounted
  useEffect(() => {
    if (!connected || !joined || !socket) return;

    const onUpdate = (payload: AppSocketEvents["bingo.updated"]) =>
      handleUpdate(payload);

    socket.on("bingo.updated", onUpdate);

    return () => {
      socket.off("bingo.updated", onUpdate);
    };
  }, [connected, joined, socket]);

  useReconnectCatchUp(() => {
    if (guildId) invalidate(guildId, boardId);
  });
};
