import {
  getBingoControllerGetBoardQueryOptions,
  getBingoControllerListBoardsQueryOptions,
  type BingoBoardSummaryResponseDto,
} from "@lootlog/client/main";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import { useWindowsStore } from "@/store/windows.store";
import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BingoCompactGrid } from "./components/bingo-compact-grid";
import { useBingoSocket } from "./hooks/use-bingo-socket";

const pickActiveBoard = (
  boards: ReadonlyArray<BingoBoardSummaryResponseDto>,
  selectedBoardId: string | null,
): BingoBoardSummaryResponseDto | null =>
  boards.find((board) => board.id === selectedBoardId) ??
  boards.find((board) => board.status === "ACTIVE") ??
  boards[0] ??
  null;

type BingoWindowProps = {
  readonly isOpen: boolean;
};

export const BingoWindow = ({ isOpen }: BingoWindowProps) => {
  const { t } = useTranslation("bingo");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const guildId = useSelectedLootlogGuildId();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const listQuery = useQuery({
    ...getBingoControllerListBoardsQueryOptions({ guildId: guildId ?? "" }),
    enabled: Boolean(guildId),
  });

  const boards = listQuery.data?.items ?? [];
  const activeBoard = pickActiveBoard(boards, selectedBoardId);

  useBingoSocket(guildId, activeBoard?.id);

  const detailQuery = useQuery({
    ...getBingoControllerGetBoardQueryOptions({
      guildId: guildId ?? "",
      boardId: activeBoard?.id ?? "",
    }),
    enabled: Boolean(guildId && activeBoard?.id),
  });

  const detail = detailQuery.data ?? null;

  const viewerRank = detail
    ? (detail.leaderboard.find(
        (entry) => entry.member.id === detail.viewerMemberId,
      )?.rank ?? null)
    : null;

  const emptyMessage = !guildId
    ? t("empty.noGuild")
    : boards.length === 0
      ? t("empty.noBoards")
      : null;

  return (
    <DraggableWindow
      isOpen={isOpen}
      id="bingo"
      title={t("window.title")}
      onClose={() => setOpen("bingo", false)}
      resizable
      minWidth={320}
      minHeight={260}
    >
      <ScrollArea className="ll:h-full ll:pr-1">
        {emptyMessage ? (
          <div className="ll:p-3 ll:text-center ll:text-xs ll:text-white/60">
            {emptyMessage}
          </div>
        ) : (
          <div className="ll:space-y-2 ll:p-1">
            {boards.length > 1 ? (
              <div className="ll:flex ll:flex-wrap ll:gap-1">
                {boards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => setSelectedBoardId(board.id)}
                    className={cn(
                      "ll:cursor-pointer ll:rounded ll:border ll:px-2 ll:py-0.5 ll:text-[10px]",
                      board.id === activeBoard?.id
                        ? "ll:border-sky-400/70 ll:bg-sky-500/20 ll:text-white"
                        : "ll:border-white/15 ll:bg-black/30 ll:text-white/70",
                    )}
                  >
                    {board.name}
                  </button>
                ))}
              </div>
            ) : null}

            {detail ? (
              <>
                <div className="ll:flex ll:flex-wrap ll:items-center ll:justify-between ll:gap-1 ll:rounded ll:border ll:border-white/10 ll:bg-black/30 ll:px-2 ll:py-1 ll:text-[10px]">
                  <span className="ll:truncate ll:font-semibold ll:text-white">
                    {detail.board.name}
                  </span>
                  <span className="ll:text-white/75">
                    {t("summary.tiles", {
                      done: detail.board.viewerCompletedTiles,
                      total: detail.board.size * detail.board.size,
                    })}{" "}
                    ·{" "}
                    {t("summary.lines", {
                      count: detail.board.viewerCompletedLines,
                    })}{" "}
                    ·{" "}
                    {t("summary.points", {
                      points: detail.board.viewerTotalPoints,
                    })}
                    {viewerRank !== null
                      ? ` · ${t("summary.rank", { rank: viewerRank })}`
                      : ""}
                  </span>
                </div>
                <BingoCompactGrid detail={detail} />
              </>
            ) : null}
          </div>
        )}
      </ScrollArea>
    </DraggableWindow>
  );
};
