import {
  getBingoControllerListBoardsQueryOptions,
  type BingoBoardSummaryResponseDtoStatus,
} from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { ROUTES } from "@/config/routes";
import { canManageEvent } from "@/features/guild/events/utils/event-access";
import { Badge, type BadgeProps } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { PageHeader } from "@lootlog/ui/components/page-header";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Grid3x3, Plus, Settings2, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BingoCreateDialog } from "./bingo-create-dialog";
import { useBingoSocket } from "./use-bingo-socket";

const STATUS_BADGE_VARIANT: Record<
  BingoBoardSummaryResponseDtoStatus,
  BadgeProps["variant"]
> = {
  ACTIVE: "ready",
  DRAFT: "timer",
  FINISHED: "outline",
};

export const BingoListPage = () => {
  const guildId = useGuildId() ?? "";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: accessPolicy } = useGuildPermissions();
  const canManage = canManageEvent(accessPolicy);
  const [createOpen, setCreateOpen] = useState(false);

  useBingoSocket({ guildId });

  const { data, isLoading } = useQuery({
    ...getBingoControllerListBoardsQueryOptions({ guildId }),
    enabled: Boolean(guildId),
  });

  const boards = data?.items ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <PageHeader
        icon={Grid3x3}
        title={t("bingo.title")}
        description={t("bingo.subtitle")}
        actions={
          canManage ? (
            <Button
              onClick={() => setCreateOpen(true)}
              icon={<Plus className="size-4" />}
            >
              {t("bingo.create")}
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl border border-border/60 bg-muted/30"
            />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Grid3x3}
            title={t("bingo.emptyTitle")}
            description={t("bingo.emptyDescription")}
            action={
              canManage ? (
                <Button
                  onClick={() => setCreateOpen(true)}
                  icon={<Plus className="size-4" />}
                >
                  {t("bingo.create")}
                </Button>
              ) : null
            }
          />
        </SectionCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {boards.map((board) => (
            <SectionCard key={board.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {board.name}
                  </h2>
                  {board.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {board.description}
                    </p>
                  ) : null}
                </div>
                <ChevronLink
                  render={
                    <Link to={ROUTES.guild.bingo.board(guildId, board.id)} />
                  }
                >
                  {t("bingo.actions.openBoard")}
                </ChevronLink>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={STATUS_BADGE_VARIANT[board.status]}>
                  {t(`bingo.status.${board.status}`)}
                </Badge>
                <Badge variant="outline">{t(`bingo.mode.${board.mode}`)}</Badge>
                <Badge variant="outline">
                  {t("bingo.boardSize.value", { size: board.size })}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{board.world ?? t("bingo.stats.worldAny")}</span>
                <span className="inline-flex items-center gap-1">
                  <Grid3x3 className="size-3.5" />
                  {t("bingo.units.tileFraction", {
                    done: board.configuredTileCount,
                    total: board.size * board.size,
                  })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {board.participantCount}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Trophy className="size-3.5 text-amber-500" />
                  {t("bingo.units.tiles", {
                    done: board.viewerCompletedTiles,
                    total: board.size * board.size,
                  })}{" "}
                  ·{" "}
                  {t("bingo.units.lines", {
                    count: board.viewerCompletedLines,
                  })}{" "}
                  ·{" "}
                  {t("bingo.units.points", {
                    points: board.viewerTotalPoints,
                  })}
                </span>
              </div>

              {canManage ? (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    icon={<Settings2 className="size-3.5" />}
                    render={
                      <Link to={ROUTES.guild.bingo.edit(guildId, board.id)} />
                    }
                  >
                    {t("bingo.edit")}
                  </Button>
                </div>
              ) : null}
            </SectionCard>
          ))}
        </div>
      )}

      {canManage ? (
        <BingoCreateDialog
          guildId={guildId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(boardId) => {
            void navigate({ to: ROUTES.guild.bingo.edit(guildId, boardId) });
          }}
        />
      ) : null}
    </div>
  );
};
