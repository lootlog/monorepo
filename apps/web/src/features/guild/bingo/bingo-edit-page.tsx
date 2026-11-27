import {
  getBingoControllerGetBoardQueryKey,
  getBingoControllerGetBoardQueryOptions,
  getBingoControllerListBoardsQueryKey,
} from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BingoEditForm } from "./bingo-edit-form";

type BingoEditPageProps = {
  readonly boardId: string;
};

export const BingoEditPage = ({ boardId }: BingoEditPageProps) => {
  const guildId = useGuildId() ?? "";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    ...getBingoControllerGetBoardQueryOptions({ guildId, boardId }),
    enabled: Boolean(guildId && boardId),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted/30" />
        <div className="h-96 animate-pulse rounded-xl bg-muted/30" />
      </div>
    );
  }

  return (
    <BingoEditForm
      key={data.board.updatedAt}
      guildId={guildId}
      boardId={boardId}
      data={data}
      onInvalidate={async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getBingoControllerListBoardsQueryKey({ guildId }),
          }),
          queryClient.invalidateQueries({
            queryKey: getBingoControllerGetBoardQueryKey({ guildId, boardId }),
          }),
        ]);
      }}
    />
  );
};
