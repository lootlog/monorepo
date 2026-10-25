import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { RankBadge } from "@/components/common/rank-badge";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { EventRanking } from "../../types/api";
import { formatDurationHuman } from "../../utils/format-duration";
import { EventRankingActions } from "./event-ranking-actions";
import { EventRankingPoints } from "./event-ranking-points";
import { getRankingMemberName } from "./get-ranking-member-name";
import { RankingMemberName } from "./ranking-member-name";

type EventRankingTilesProps = {
  /** Already ordered by points. */
  rankings: EventRanking[];
  guildId: string;
  eventId: string;
  canEdit: boolean;
  currentMemberId?: number;
  /** Members who have left the Lootlog. */
  inactiveMemberIds: ReadonlySet<number>;
  onEditPoints: (rankingId: string) => void;
  isEditPending: boolean;
};

/** The ranking on phones, where the table's columns don't fit: one tile per member, opening their kills. */
export const EventRankingTiles = ({
  rankings,
  guildId,
  eventId,
  canEdit,
  currentMemberId,
  inactiveMemberIds,
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
              isCurrentMember && VIEWER_ROW_CLASS,
            )}
          >
            <Link
              to="/$guildId/events/$eventId/members/$memberId"
              params={{ guildId, eventId, memberId: String(ranking.memberId) }}
              aria-label={t("events.ranking.openMemberStats", {
                memberName: getRankingMemberName(ranking, t),
              })}
              className={getListTileLinkClassName(true)}
            >
              <RankBadge rank={index + 1} />
              <span className="min-w-0 flex-1">
                <RankingMemberName
                  ranking={ranking}
                  inactive={inactiveMemberIds.has(ranking.memberId)}
                  className="text-sm"
                />
                <span className="block truncate text-xs text-muted-foreground tabular-nums">
                  {t("events.ranking.kills")} {ranking.totalKills} ·{" "}
                  {t("events.ranking.time")}{" "}
                  {formatDurationHuman(ranking.totalTimeSeconds)}
                  {afkPercentage > 0 &&
                    ` · ${t("events.kills.afkTime")} ${afkPercentage}%`}
                </span>
              </span>
            </Link>
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
