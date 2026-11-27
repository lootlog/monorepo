import {
  getBingoControllerGetBoardQueryKey,
  getBingoControllerListBoardsQueryKey,
} from "@lootlog/client/main";
import { useGateway } from "@/hooks/utils/use-gateway";
import type { GatewayJoin } from "@/lib/gateway-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type UseBingoSocketOptions = {
  readonly guildId: string;
  readonly boardId?: string;
};

export const useBingoSocket = ({ guildId, boardId }: UseBingoSocketOptions) => {
  const { socket } = useGateway();
  const queryClient = useQueryClient();

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- subscribes to external gateway bingo.updated and join recovery events while mounted
  useEffect(() => {
    if (!guildId) return;

    const invalidate = (targetBoardId?: string) => {
      void queryClient.invalidateQueries({
        queryKey: getBingoControllerListBoardsQueryKey({ guildId }),
      });

      const boardToInvalidate = targetBoardId ?? boardId;

      if (boardToInvalidate) {
        void queryClient.invalidateQueries({
          queryKey: getBingoControllerGetBoardQueryKey({
            guildId,
            boardId: boardToInvalidate,
          }),
        });
      }
    };

    const handleBingoUpdated = (payload: {
      readonly guildId: string;
      readonly boardId: string;
    }) => {
      if (payload.guildId !== guildId) return;

      invalidate(payload.boardId);
    };

    const handleJoin = ({ recover }: GatewayJoin) => {
      if (!recover) return;

      invalidate();
    };

    socket.on("bingo.updated", handleBingoUpdated);
    socket.on("join", handleJoin);

    return () => {
      socket.off("bingo.updated", handleBingoUpdated);
      socket.off("join", handleJoin);
    };
  }, [socket, queryClient, guildId, boardId]);
};
