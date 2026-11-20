import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { EventRanking } from "@/lib/api/event-types";
import { formatPoints } from "../../utils/format-points";
import { getRankingLeaders } from "./event-ranking-selection";
import { RankingMemberName } from "./ranking-member-name";
import { formatDuration } from "@/utils/date/format-duration";

type EventRankingLeaderboardProps = {
  rankings: EventRanking[];
  guildId: string;
  eventId: string;
  limit: number;
  /** Adds the member's own place when it falls outside the leaders. */
  currentMemberId?: number;
  /** Keeps the member's own place in view at the bottom of a scrolling rail. */
  pinViewer?: boolean;
};

/** The event's leaders by points, each opening the member's kills. */
export const EventRankingLeaderboard = ({
  rankings,
  guildId,
  eventId,
  limit,
  currentMemberId,
  pinViewer = false,
}: EventRankingLeaderboardProps) => {
  const { t } = useTranslation();
  const { leaders, own } = getRankingLeaders(rankings, limit, currentMemberId);

  const renderRow = ({
    ranking,
    place,
  }: {
    ranking: EventRanking;
    place: number;
  }) => (
    <StatsLeaderboardRow
      key={ranking.id}
      rank={place}
      title={
        <RankingMemberName
          ranking={ranking}
          guildId={guildId}
          eventId={eventId}
          className="flex"
          nameClassName="font-semibold leading-tight"
        />
      }
      subtitle={[
        t("statistics.count", { count: ranking.totalKills }),
        formatDuration(ranking.totalTimeSeconds, "human"),
        ranking.pointsModified && t("events.ranking.pointsAdjusted"),
      ]
        .filter(Boolean)
        .join(" · ")}
      value={ranking.totalPoints}
      formatValue={(points) =>
        `${formatPoints(points)} ${t("events.common.pointsShort")}`
      }
      link={{
        to: "/$guildId/events/$eventId/members/$memberId",
        params: { guildId, eventId, memberId: String(ranking.memberId) },
      }}
      isViewer={ranking.memberId === currentMemberId}
      pinned={pinViewer && ranking.memberId === currentMemberId}
    />
  );

  return (
    <ol>
      {leaders.map(renderRow)}
      {own && (
        <>
          {/* The places skipped between the leaders and the member's own. */}
          <li
            aria-hidden
            className={cn(
              "flex h-6 items-center text-xs leading-none text-muted-foreground",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            ⋯
          </li>
          {renderRow(own)}
        </>
      )}
    </ol>
  );
};
