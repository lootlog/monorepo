import {
  getBingoControllerGetBoardQueryKey,
  getBingoControllerGetBoardQueryOptions,
  getBingoControllerListBoardsQueryKey,
} from "@lootlog/client/main";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BingoEditForm } from "./bingo-edit-form";

type BingoEditPageProps = {
  readonly boardId: string;
};

export const BingoEditPage = ({ boardId }: BingoEditPageProps) => {
  const guildId = useGuildId() ?? "";
  const queryClient = useQueryClient();

  const { data } = useQuery({
    ...getBingoControllerGetBoardQueryOptions({ guildId, boardId }),
    enabled: Boolean(guildId && boardId),
  });

  if (!data) {
    return <PageSkeleton />;
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
