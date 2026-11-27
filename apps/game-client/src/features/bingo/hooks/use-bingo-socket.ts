import {
  getBingoControllerGetBoardQueryKey,
  getBingoControllerListBoardsQueryKey,
} from "@lootlog/client/main";
import { useSocket } from "@/contexts/socket-context";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef } from "react";

export const useBingoSocket = (
  guildId: string | undefined,
  boardId?: string,
) => {
  const { socket, connected, joined, status } = useSocket();
  const queryClient = useQueryClient();
  const needsCatchUp = useRef(false);

  const invalidate = useEffectEvent(
    (targetGuildId: string, targetBoardId?: string) => {
      void queryClient.invalidateQueries({
        queryKey: getBingoControllerListBoardsQueryKey({
          guildId: targetGuildId,
        }),
      });

      const idToRefresh = targetBoardId ?? boardId;

      if (idToRefresh) {
        void queryClient.invalidateQueries({
          queryKey: getBingoControllerGetBoardQueryKey({
            guildId: targetGuildId,
            boardId: idToRefresh,
          }),
        });
      }
    },
  );

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- subscribes to external gateway bingo.updated events and catches up on reconnect while mounted
  useEffect(() => {
    if (status === "unreachable") needsCatchUp.current = true;

    if (!connected || !joined || !socket || !guildId) return;

    const handleUpdate = (payload: {
      readonly guildId: string;
      readonly boardId: string;
    }) => {
      if (payload.guildId !== guildId) return;

      invalidate(payload.guildId, payload.boardId);
    };

    socket.on("bingo.updated", handleUpdate);

    if (needsCatchUp.current) invalidate(guildId, boardId);

    needsCatchUp.current = true;

    return () => {
      socket.off("bingo.updated", handleUpdate);
    };
  }, [connected, joined, socket, status, guildId, boardId]);
};
