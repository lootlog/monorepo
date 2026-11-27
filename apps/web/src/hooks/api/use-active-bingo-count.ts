import {
  BingoBoardSummaryResponseDtoStatus,
  useBingoControllerListBoards,
} from "@lootlog/client/main";

export const useActiveBingoCount = (guildId: string) => {
  const { data } = useBingoControllerListBoards(
    { guildId },
    { query: { enabled: Boolean(guildId) } },
  );

  return (
    data?.items.filter(
      (board) => board.status === BingoBoardSummaryResponseDtoStatus.ACTIVE,
    ).length ?? 0
  );
};
