import type { BingoBoardSummaryResponseDto } from "@lootlog/client/main";
import { MetaItem } from "@/components/common/meta-item";
import { TileChevron } from "@/components/common/tile-chevron";
import { ROUTES } from "@/config/routes";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_HOVER_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import { Globe, Grid3x3, Settings2, Trophy, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BINGO_STATUS_BADGE_VARIANT } from "./bingo-status";

type BingoListTileProps = {
  readonly guildId: string;
  readonly board: BingoBoardSummaryResponseDto;
  readonly canManage: boolean;
};

export const BingoListTile = ({
  guildId,
  board,
  canManage,
}: BingoListTileProps) => {
  const { t } = useTranslation();
  const isActive = board.status === "ACTIVE";
  const totalTileCount = board.size * board.size;

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div
        className={cn(
          "flex items-center",
          LIST_TILE_HOVER_CLASS,
          isActive && "bg-signal-live/[0.04] hover:bg-signal-live/[0.08]",
        )}
      >
        <Link
          to={ROUTES.guild.bingo.board(guildId, board.id)}
          className={cn(getListTileLinkClassName(canManage), "group/tile")}
        >
          <div
            className={cn(
              "relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
              isActive && "bg-signal-live/10",
            )}
          >
            <Grid3x3
              className={cn(
                "size-4 text-muted-foreground",
                isActive && "text-signal-live",
              )}
            />
            {isActive && (
              <span className="absolute -right-0.5 -top-0.5 flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-signal-live opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-signal-live" />
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="min-w-0 break-words text-sm font-semibold">
                {board.name}
              </h3>
              <Badge
                variant={BINGO_STATUS_BADGE_VARIANT[board.status]}
                size="sm"
              >
                {t(`bingo.status.${board.status}`)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <MetaItem icon={Globe}>
                {board.world
                  ? upperFirst(board.world)
                  : t("bingo.stats.worldAny")}
              </MetaItem>
              <MetaItem icon={Grid3x3}>
                {t(`bingo.mode.${board.mode}`)} ·{" "}
                {t("bingo.boardSize.value", { size: board.size })}
              </MetaItem>
              <MetaItem icon={Users} label={t("bingo.stats.participants")}>
                {board.participantCount}
              </MetaItem>
              <MetaItem icon={Trophy} label={t("bingo.stats.yourProgress")}>
                {t("bingo.units.tiles", {
                  done: board.viewerCompletedTiles,
                  total: totalTileCount,
                })}{" "}
                · {t("bingo.units.points", { points: board.viewerTotalPoints })}
              </MetaItem>
            </div>
          </div>

          <TileChevron />
        </Link>

        {canManage && (
          <div className={LIST_TILE_ACTIONS_CLASS}>
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              aria-label={t("bingo.editNamed", { name: board.name })}
              title={t("bingo.editNamed", { name: board.name })}
              render={<Link to={ROUTES.guild.bingo.edit(guildId, board.id)} />}
            >
              <Settings2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
