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
import { ROUTES } from "@/config/routes";
import { canManageEvent } from "@/features/guild/events/utils/event-access";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { Badge, type BadgeProps } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { PageHeader } from "@lootlog/ui/components/page-header";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { toast } from "@lootlog/ui/lib/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Grid3x3 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BingoActivityFeed } from "./bingo-activity-feed";
import { BingoAdminActions } from "./bingo-admin-actions";
import { BingoBoardGrid } from "./bingo-board-grid";
import { BingoLeaderboard } from "./bingo-leaderboard";
import { BingoManualProgressDialog } from "./bingo-manual-progress-dialog";
import { BingoMemberStats } from "./bingo-member-stats";
import { useBingoSocket } from "./use-bingo-socket";

const STATUS_BADGE_VARIANT: Record<
  BingoBoardSummaryResponseDtoStatus,
  BadgeProps["variant"]
> = {
  ACTIVE: "ready",
  DRAFT: "timer",
  FINISHED: "outline",
};

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
  inspectedMemberId: number | null,
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
    isInspectingOther:
      inspectedMemberId !== null && inspectedMemberId !== data.viewerMemberId,
  };
};

type BingoDetailPageProps = {
  readonly boardId: string;
};

export const BingoDetailPage = ({ boardId }: BingoDetailPageProps) => {
  const guildId = useGuildId() ?? "";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: accessPolicy } = useGuildPermissions();
  const canManage = canManageEvent(accessPolicy);

  const updateBoard = useBingoControllerUpdateBoard();
  const deleteBoard = useBingoControllerDeleteBoard();

  useBingoSocket({ guildId, boardId });

  const { data, isLoading } = useQuery({
    ...getBingoControllerGetBoardQueryOptions({ guildId, boardId }),
    enabled: Boolean(guildId && boardId),
  });

  const [inspectedMemberId, setInspectedMemberId] = useState<number | null>(
    null,
  );

  const [manualOpen, setManualOpen] = useState(false);

  const [manualTileId, setManualTileId] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted/30" />
        <div className="h-96 animate-pulse rounded-xl bg-muted/30" />
      </div>
    );
  }

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

  const boardSubtitle =
    data.board.description ??
    `${data.board.world ?? t("bingo.stats.worldAny")} · ${t(`bingo.mode.${data.board.mode}`)} · ${t("bingo.boardSize.value", { size: data.board.size })}`;

  const totalTileCount = data.board.size * data.board.size;

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4">
      <PageHeader
        icon={Grid3x3}
        title={data.board.name}
        description={boardSubtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[data.board.status]}>
              {t(`bingo.status.${data.board.status}`)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              icon={<ArrowLeft className="size-4" />}
              render={<Link to={ROUTES.guild.bingo.base(guildId)} />}
            >
              {t("bingo.backToList")}
            </Button>
            {canManage ? (
              <BingoAdminActions
                guildId={guildId}
                boardId={boardId}
                status={data.board.status}
                isUpdating={updateBoard.isPending}
                onChangeStatus={changeStatus}
                onOpenManual={() => {
                  setManualTileId(null);
                  setManualOpen(true);
                }}
                onOpenDelete={() => setDeleteConfirmOpen(true)}
              />
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <BingoMemberStats
            completedTileCount={completedTileCount}
            totalTileCount={totalTileCount}
            completedLineCount={completedLineCount}
            totalPoints={totalPoints}
          />
          <SectionCard className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {isInspectingOther
                  ? t("bingo.actions.viewingPlayer", {
                      name: inspectedMemberName,
                    })
                  : t("bingo.actions.viewOwnBoard")}
              </span>

              {isInspectingOther ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInspectedMemberId(null)}
                >
                  {t("bingo.actions.viewOwnBoard")}
                </Button>
              ) : null}
            </div>

            <BingoBoardGrid
              tiles={data.tiles}
              mode={data.board.mode}
              size={data.board.size}
              pointsPerTile={data.board.pointsPerTile}
              selectedMemberId={activeMemberId}
              progressByTileId={progressByTileId}
              onSelectCell={handleSelectCell}
            />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-4">
          <SectionCard className="overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t("bingo.leaderboard.title")}
              </h2>
            </div>
            <BingoLeaderboard
              entries={data.leaderboard}
              totalTileCount={totalTileCount}
              selectedMemberId={activeMemberId}
              viewerMemberId={data.viewerMemberId}
              onSelectMember={(memberId) => setInspectedMemberId(memberId)}
            />
          </SectionCard>

          <SectionCard className="overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t("bingo.activity.title")}
              </h2>
            </div>
            <BingoActivityFeed items={data.recentActivity} />
          </SectionCard>
        </div>
      </div>

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
