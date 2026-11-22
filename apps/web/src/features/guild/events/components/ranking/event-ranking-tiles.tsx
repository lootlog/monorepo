import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_HOVER_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { RankBadge } from "@/components/common/rank-badge";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { EventRanking } from "@/lib/api/event-types";
import { EventRankingActions } from "./event-ranking-actions";
import { EventRankingPoints } from "./event-ranking-points";
import { getRankingMemberName } from "./get-ranking-member-name";
import { RankingMemberName } from "./ranking-member-name";
import { formatDuration } from "@/utils/date/format-duration";

type EventRankingTilesProps = {
  rankings: EventRanking[];
  guildId: string;
  eventId: string;
  canEdit: boolean;
  currentMemberId?: number;
  onEditPoints: (rankingId: string) => void;
  isEditPending: boolean;
};

export const EventRankingTiles = ({
  rankings,
  guildId,
  eventId,
  canEdit,
  currentMemberId,
  onEditPoints,
  isEditPending,
}: EventRankingTilesProps) => {
  const { t } = useTranslation();

  return (
    <ul className="@container/ranking">
      {rankings.map((ranking, index) => {
        const isCurrentMember = ranking.memberId === currentMemberId;
        const afkPercentage = Math.round(ranking.avgAfkPercentage);

        return (
          <li
            key={ranking.id}
            id={`event-ranking-row-${ranking.id}`}
            aria-current={isCurrentMember || undefined}
            data-list-tile
            className={cn(
              "flex min-h-16 items-center",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_HOVER_CLASS,
              isCurrentMember && VIEWER_ROW_CLASS,
            )}
          >
            <div className="relative flex min-w-0 flex-1 self-stretch">
              <Link
                to="/$guildId/events/$eventId/members/$memberId"
                params={{
                  guildId,
                  eventId,
                  memberId: String(ranking.memberId),
                }}
                aria-label={t("events.ranking.openMemberStats", {
                  memberName: getRankingMemberName(ranking, t),
                })}
                className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              />
              <div
                className={cn(
                  getListTileLinkClassName(true),
                  "pointer-events-none relative",
                )}
              >
                <RankBadge rank={index + 1} />
                <span className="min-w-0 flex-1">
                  <span className="pointer-events-auto flex w-fit max-w-full min-w-0">
                    <RankingMemberName
                      ranking={ranking}
                      guildId={guildId}
                      eventId={eventId}
                      nameClassName="text-sm font-semibold"
                    />
                  </span>
                  <span className="block truncate text-xs text-muted-foreground tabular-nums">
                    {t("events.ranking.kills")} {ranking.totalKills} ·{" "}
                    {t("events.ranking.time")}{" "}
                    {formatDuration(ranking.totalTimeSeconds, "human")}
                    {afkPercentage > 0 &&
                      ` · ${t("events.kills.afkTime")} ${afkPercentage}%`}
                  </span>
                </span>
              </div>
            </div>
            <div data-ranking-actions className={LIST_TILE_ACTIONS_CLASS}>
              <EventRankingPoints ranking={ranking} canViewHistory={canEdit} />
              <EventRankingActions
                canEdit={canEdit}
                onEditPoints={() => onEditPoints(ranking.id)}
                isEditPending={isEditPending}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
