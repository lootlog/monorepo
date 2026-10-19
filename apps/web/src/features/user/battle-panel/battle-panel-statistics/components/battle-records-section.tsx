import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { BandSection } from "@/components/common/band-section";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { formatDurationCompact } from "@/features/guild/events/utils/format-duration";
import type { BattleDurationStats, Streak } from "@/lib/api/battlelog-types";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { Flame, Hourglass, Snowflake, Timer, Zap } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type BattleRecordsSectionProps = {
  streak: Streak | undefined;
  duration: BattleDurationStats | undefined;
  isLoading: boolean;
};

// An average of zero means there were no battles with that result.
const formatAverage = (seconds: number) =>
  seconds > 0 ? formatDurationCompact(Math.round(seconds)) : "–";

const formatBattleDuration = (battle: { duration: number } | null) =>
  battle ? formatDurationCompact(Math.round(battle.duration)) : "–";

/** The current streak and how long battles last, the longest ones linked. */
export function BattleRecordsSection({
  streak,
  duration,
  isLoading,
}: BattleRecordsSectionProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const pending = isLoading || !streak || !duration;
  const loadingValue = <Skeleton className="h-7 w-20" />;
  const loadingDetail = <Skeleton className="h-4 w-24" />;

  const isWinStreak = streak?.current.type === "wins";
  const hasStreak = streak && streak.current.type !== "none";

  const battleLink = (
    battle: { battleId: string } | null | undefined,
  ): ReactNode =>
    battle && (
      <Link
        to="/@me/battle-panel/battles/$battleId"
        params={{ battleId: battle.battleId }}
        className="rounded-sm underline decoration-muted-foreground/60 underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("battlePanel.statistics.records.openBattle")}
      </Link>
    );

  return (
    <BandSection
      id={headingId}
      title={t("battlePanel.statistics.records.title")}
      tiled
    >
      <StatsTileGrid className="sm:grid-cols-2 xl:grid-cols-4">
        <StatsTile
          icon={isWinStreak || !hasStreak ? Flame : Snowflake}
          label={t("battlePanel.statistics.currentStreak.title")}
          value={
            pending ? (
              loadingValue
            ) : hasStreak ? (
              <span
                className={
                  isWinStreak
                    ? BATTLE_TEXT_COLORS.metric.winStreak
                    : BATTLE_TEXT_COLORS.metric.lossStreak
                }
              >
                {t(
                  isWinStreak
                    ? "battlePanel.statistics.records.wins"
                    : "battlePanel.statistics.records.losses",
                  { count: streak.current.count },
                )}
              </span>
            ) : (
              "–"
            )
          }
          // The record of the same kind as the current streak, or of wins.
          detail={
            pending
              ? loadingDetail
              : t("battlePanel.statistics.records.record", {
                  value:
                    hasStreak && !isWinStreak
                      ? t("battlePanel.statistics.records.losses", {
                          count: streak.longest.losses,
                        })
                      : t("battlePanel.statistics.records.wins", {
                          count: streak.longest.wins,
                        }),
                })
          }
        />
        <StatsTile
          icon={Timer}
          label={t("battlePanel.statistics.records.averageDuration")}
          value={
            pending ? (
              loadingValue
            ) : (
              <>
                <span className={BATTLE_TEXT_COLORS.result.won}>
                  {formatAverage(duration.avgWinDuration)}
                </span>
                <span className="px-1.5 text-muted-foreground">/</span>
                <span className={BATTLE_TEXT_COLORS.result.lost}>
                  {formatAverage(duration.avgLossDuration)}
                </span>
              </>
            )
          }
          detail={
            pending
              ? loadingDetail
              : t("battlePanel.statistics.records.averageDurationDetail")
          }
        />
        <StatsTile
          icon={Zap}
          label={t("battlePanel.statistics.records.fastest")}
          value={
            pending ? loadingValue : formatBattleDuration(duration.fastest)
          }
          detail={pending ? loadingDetail : battleLink(duration.fastest)}
        />
        <StatsTile
          icon={Hourglass}
          label={t("battlePanel.statistics.records.longestBattle")}
          value={
            pending ? loadingValue : formatBattleDuration(duration.longest)
          }
          detail={pending ? loadingDetail : battleLink(duration.longest)}
        />
      </StatsTileGrid>
    </BandSection>
  );
}
