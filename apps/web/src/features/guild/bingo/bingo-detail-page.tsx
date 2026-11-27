import {
  getBingoControllerGetBoardQueryKey,
  getBingoControllerGetBoardQueryOptions,
  getBingoControllerListBoardsQueryKey,
  useBingoControllerDeleteBoard,
  useBingoControllerUpdateBoard,
  type BingoBoardDetailResponseDto,
  type BingoBoardDetailResponseDtoMemberProgressItem,
  type BingoBoardSummaryResponseDtoStatus,
} from "@lootlog/client/main";
import { DetailBar } from "@/components/common/detail-bar";
import { DetailBarFact } from "@/components/common/detail-bar-fact";
import { DetailBarFacts } from "@/components/common/detail-bar-facts";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { ROUTES } from "@/config/routes";
import { canManageEvent } from "@/features/guild/events/utils/event-access";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { BandSection } from "@lootlog/ui/components/band-section";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { LIST_TILE_INSET_CLASS } from "@lootlog/ui/lib/list-tile";
import { toast } from "@lootlog/ui/lib/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BingoActivityFeed } from "./bingo-activity-feed";
import { BingoAdminActions } from "./bingo-admin-actions";
import { BingoBoardGrid } from "./bingo-board-grid";
import {
  BINGO_DETAIL_ACTIVITY_SCROLL_CLASS,
  BINGO_DETAIL_BOARD_COLUMN_CLASS,
  BINGO_DETAIL_COLUMNS_CLASS,
  BINGO_DETAIL_LEADERBOARD_SCROLL_CLASS,
  BINGO_DETAIL_RAIL_CLASS,
  BINGO_DETAIL_SECTION_CLASS,
} from "./bingo-detail-layout";
import { BingoDetailSkeleton } from "./bingo-detail-skeleton";
import { BingoLeaderboard } from "./bingo-leaderboard";
import { BingoManualProgressDialog } from "./bingo-manual-progress-dialog";
import { BingoMemberStats } from "./bingo-member-stats";
import { BINGO_STATUS_TEXT_CLASS } from "./bingo-status";
import { useBingoSocket } from "./use-bingo-socket";

const indexMemberProgress = (
  rows: ReadonlyArray<BingoBoardDetailResponseDtoMemberProgressItem>,
  memberId: number,
) =>
  new Map<string, BingoBoardDetailResponseDtoMemberProgressItem>(
    rows.flatMap((row) =>
      row.memberId === memberId ? [[row.tileId, row] as const] : [],
    ),
  );

const resolveBoardView = (
  data: BingoBoardDetailResponseDto,
  inspectedMemberId: number | undefined,
) => {
  const activeMemberId = inspectedMemberId ?? data.viewerMemberId;

  const inspectedEntry =
    data.leaderboard.find((entry) => entry.member.id === activeMemberId) ??
    null;

  return {
    activeMemberId,
    inspectedMemberName: inspectedEntry?.member.name ?? "",
    completedTileCount: inspectedEntry?.completedTileCount ?? 0,
    completedLineCount: inspectedEntry?.completedLines.length ?? 0,
    totalPoints: inspectedEntry?.totalPoints ?? 0,
    progressByTileId: indexMemberProgress(data.memberProgress, activeMemberId),
    isInspectingOther: activeMemberId !== data.viewerMemberId,
  };
};

type BingoDetailPageProps = {
  readonly boardId: string;
  readonly inspectedMemberId: number | undefined;
};

export const BingoDetailPage = ({
  boardId,
  inspectedMemberId,
}: BingoDetailPageProps) => {
  const guildId = useGuildId() ?? "";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: accessPolicy } = useGuildPermissions();
  const canManage = canManageEvent(accessPolicy);

  const updateBoard = useBingoControllerUpdateBoard();
  const deleteBoard = useBingoControllerDeleteBoard();

  useBingoSocket({ guildId, boardId });

  const { data } = useQuery({
    ...getBingoControllerGetBoardQueryOptions({ guildId, boardId }),
    enabled: Boolean(guildId && boardId),
  });

  const [manualOpen, setManualOpen] = useState(false);

  const [manualTileId, setManualTileId] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  if (!data) {
    return <BingoDetailSkeleton />;
  }

  const { board } = data;

  const {
    activeMemberId,
    inspectedMemberName,
    completedTileCount,
    completedLineCount,
    totalPoints,
    progressByTileId,
    isInspectingOther,
  } = resolveBoardView(data, inspectedMemberId);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getBingoControllerListBoardsQueryKey({ guildId }),
      }),
      queryClient.invalidateQueries({
        queryKey: getBingoControllerGetBoardQueryKey({ guildId, boardId }),
      }),
    ]);
  };

  const changeStatus = async (status: BingoBoardSummaryResponseDtoStatus) => {
    try {
      await updateBoard.mutateAsync({
        pathParams: { guildId, boardId },
        data: { status },
      });
      await invalidate();
      toast.success(t("bingo.toasts.updated"));
    } catch {
      toast.error(t("bingo.toasts.error"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBoard.mutateAsync({ pathParams: { guildId, boardId } });
      await queryClient.invalidateQueries({
        queryKey: getBingoControllerListBoardsQueryKey({ guildId }),
      });
      toast.success(t("bingo.toasts.deleted"));
      void navigate({ to: ROUTES.guild.bingo.base(guildId) });
    } catch {
      toast.error(t("bingo.toasts.error"));
    }
  };

  const totalTileCount = board.size * board.size;

  const handleSelectCell = canManage
    ? (
        _row: number,
        _col: number,
        tile: BingoBoardDetailResponseDto["tiles"][number] | null,
      ) => {
        if (!tile) return;

        setManualTileId(tile.id);
        setManualOpen(true);
      }
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <div className="flex min-w-0 flex-col xl:h-full">
          <h1 className="sr-only">{board.name}</h1>
          <DetailBar
            meta={
              <DetailBarFacts>
                <DetailBarFact label={t("bingo.header.status")}>
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      BINGO_STATUS_TEXT_CLASS[board.status],
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full bg-current"
                    />
                    {t(`bingo.status.${board.status}`)}
                  </span>
                </DetailBarFact>
                <DetailBarFact label={t("bingo.header.world")}>
                  {board.world
                    ? upperFirst(board.world)
                    : t("bingo.stats.worldAny")}
                </DetailBarFact>
                <DetailBarFact label={t("bingo.header.mode")}>
                  {t(`bingo.mode.${board.mode}`)}
                </DetailBarFact>
                <DetailBarFact label={t("bingo.header.size")}>
                  {t("bingo.boardSize.value", { size: board.size })}
                </DetailBarFact>
              </DetailBarFacts>
            }
            actions={
              canManage ? (
                <BingoAdminActions
                  guildId={guildId}
                  boardId={boardId}
                  status={board.status}
                  isUpdating={updateBoard.isPending}
                  onChangeStatus={changeStatus}
                  onOpenManual={() => {
                    setManualTileId(null);
                    setManualOpen(true);
                  }}
                  onOpenDelete={() => setDeleteConfirmOpen(true)}
                />
              ) : undefined
            }
          />

          <StatsSectionColumns className={BINGO_DETAIL_COLUMNS_CLASS}>
            <ScrollArea
              orientation="vertical"
              className={BINGO_DETAIL_BOARD_COLUMN_CLASS}
            >
              <BandSection
                id="bingo-board"
                title={
                  isInspectingOther
                    ? t("bingo.actions.viewingPlayer", {
                        name: inspectedMemberName,
                      })
                    : t("bingo.board.title")
                }
                description={board.description ?? undefined}
                trailing={
                  isInspectingOther ? (
                    <ChevronLink
                      render={
                        <Link
                          to={ROUTES.guild.bingo.board(guildId, boardId)}
                          resetScroll={false}
                        />
                      }
                    >
                      {t("bingo.actions.viewOwnBoard")}
                    </ChevronLink>
                  ) : null
                }
                tiled
              >
                <BingoMemberStats
                  completedTileCount={completedTileCount}
                  totalTileCount={totalTileCount}
                  completedLineCount={completedLineCount}
                  totalPoints={totalPoints}
                />
                <div className={cn("py-4", LIST_TILE_INSET_CLASS)}>
                  <BingoBoardGrid
                    tiles={data.tiles}
                    mode={board.mode}
                    size={board.size}
                    pointsPerTile={board.pointsPerTile}
                    selectedMemberId={activeMemberId}
                    progressByTileId={progressByTileId}
                    onSelectCell={handleSelectCell}
                  />
                </div>
              </BandSection>
            </ScrollArea>

            <aside className={BINGO_DETAIL_RAIL_CLASS}>
              <div className={cn(BINGO_DETAIL_SECTION_CLASS, "xl:flex-1")}>
                <BandSection
                  id="bingo-leaderboard"
                  title={t("bingo.leaderboard.title")}
                  count={data.leaderboard.length}
                  tiled
                >
                  <ScrollArea
                    orientation="vertical"
                    className={BINGO_DETAIL_LEADERBOARD_SCROLL_CLASS}
                  >
                    <BingoLeaderboard
                      guildId={guildId}
                      boardId={boardId}
                      entries={data.leaderboard}
                      totalTileCount={totalTileCount}
                      selectedMemberId={activeMemberId}
                      viewerMemberId={data.viewerMemberId}
                    />
                  </ScrollArea>
                </BandSection>
              </div>
              <div className={cn(BINGO_DETAIL_SECTION_CLASS, "xl:max-h-[42%]")}>
                <BandSection
                  id="bingo-activity"
                  title={t("bingo.activity.title")}
                  tiled
                >
                  <ScrollArea
                    orientation="vertical"
                    className={BINGO_DETAIL_ACTIVITY_SCROLL_CLASS}
                  >
                    <BingoActivityFeed items={data.recentActivity} />
                  </ScrollArea>
                </BandSection>
              </div>
            </aside>
          </StatsSectionColumns>
        </div>
      </ScrollArea>

      {canManage ? (
        <>
          <BingoManualProgressDialog
            key={`${manualTileId ?? "none"}:${activeMemberId}:${manualOpen}`}
            guildId={guildId}
            boardId={boardId}
            tiles={data.tiles}
            initialTileId={manualTileId}
            initialMemberId={activeMemberId || null}
            open={manualOpen}
            onOpenChange={setManualOpen}
          />
          <ConfirmDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            title={t("bingo.actions.deleteConfirmTitle")}
            description={t("bingo.actions.deleteConfirmDescription")}
            confirmButtonLabel={t("bingo.actions.delete")}
            cancelButtonLabel={t("bingo.actions.cancel")}
            variant="destructive"
            onConfirm={handleDelete}
          />
        </>
      ) : null}
    </div>
  );
};
