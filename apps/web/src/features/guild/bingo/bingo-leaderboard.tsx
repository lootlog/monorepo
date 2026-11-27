import type { BingoBoardDetailResponseDtoLeaderboardItem } from "@lootlog/client/main";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

type BingoLeaderboardProps = {
  readonly guildId: string;
  readonly boardId: string;
  readonly entries: ReadonlyArray<BingoBoardDetailResponseDtoLeaderboardItem>;
  readonly totalTileCount: number;
  readonly selectedMemberId: number;
  readonly viewerMemberId: number;
};

export const BingoLeaderboard = ({
  guildId,
  boardId,
  entries,
  totalTileCount,
  selectedMemberId,
  viewerMemberId,
}: BingoLeaderboardProps) => {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return (
      <EmptyState compact icon={Trophy} title={t("bingo.leaderboard.empty")} />
    );
  }

  return (
    <ol>
      {entries.map((entry) => {
        const isViewer = entry.member.id === viewerMemberId;

        return (
          <StatsLeaderboardRow
            key={entry.member.id}
            rank={entry.rank}
            title={
              isViewer
                ? t("bingo.leaderboard.viewerName", { name: entry.member.name })
                : entry.member.name
            }
            subtitle={[
              t("bingo.units.tiles", {
                done: entry.completedTileCount,
                total: totalTileCount,
              }),
              t("bingo.units.lines", { count: entry.completedLines.length }),
              entry.isBlackout && t("bingo.stats.blackout"),
            ]
              .filter(Boolean)
              .join(" · ")}
            value={entry.totalPoints}
            formatValue={(points) => t("bingo.units.points", { points })}
            link={{
              to: "/$guildId/bingo/$boardId",
              params: { guildId, boardId },
              search: isViewer ? {} : { member: entry.member.id },
              resetScroll: false,
            }}
            isViewer={entry.member.id === selectedMemberId}
            live
          />
        );
      })}
    </ol>
  );
};
