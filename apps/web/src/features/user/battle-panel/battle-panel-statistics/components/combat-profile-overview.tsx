import {
  formatBattleMetric,
  formatSignedBattleMetric,
} from "@/components/battle/utils/value-utils";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { formatDurationCompact } from "@/features/guild/events/utils/format-duration";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import type { CombatProfileResponseDtoOutput } from "@lootlog/client/battlelog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Award,
  Crosshair,
  Hourglass,
  Sword,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type CombatProfileOverviewProps = {
  data: CombatProfileResponseDtoOutput | undefined;
  isLoading: boolean;
  /** Abyss battles change the rating instead of earning honor points. */
  rated?: boolean;
};

const compactFormatter = new Intl.NumberFormat("pl-PL", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** The battles' headline numbers, edge to edge under the filter bar. */
export function CombatProfileOverview({
  data,
  isLoading,
  rated = false,
}: CombatProfileOverviewProps) {
  const { t } = useTranslation();
  const summary = isLoading ? undefined : data?.summary;

  // Each tile keeps its label while its numbers load.
  const loading = (width: string) => <Skeleton className={`h-7 ${width}`} />;
  const loadingDetail = <Skeleton className="h-4 w-20" />;

  const perBattle = (total: number) =>
    summary && summary.totalBattles > 0 ? total / summary.totalBattles : 0;

  const ratingClassName =
    (summary?.totalRatingDelta ?? 0) >= 0
      ? BATTLE_TEXT_COLORS.result.won
      : BATTLE_TEXT_COLORS.result.lost;

  return (
    <StatsTileGrid className="sm:grid-cols-3 xl:grid-cols-5">
      <StatsTile
        icon={Trophy}
        label={t("battlePanel.statistics.combatProfile.cards.record")}
        value={
          summary ? (
            <>
              <span className={BATTLE_TEXT_COLORS.result.won}>
                {summary.wins}
              </span>
              <span className="px-1.5 text-muted-foreground">–</span>
              <span className={BATTLE_TEXT_COLORS.result.lost}>
                {summary.losses}
              </span>
            </>
          ) : (
            loading("w-20")
          )
        }
        detail={
          summary
            ? t("battlePanel.statistics.combatProfile.details.winRate", {
                value: formatBattleMetric(summary.winRate),
              })
            : loadingDetail
        }
      />
      {rated ? (
        <StatsTile
          icon={TrendingUp}
          label={t("battlePanel.statistics.combatProfile.cards.rating")}
          value={
            summary ? (
              <span className={ratingClassName}>
                {formatSignedBattleMetric(summary.totalRatingDelta)}
              </span>
            ) : (
              loading("w-16")
            )
          }
          detail={
            summary
              ? t(
                  "battlePanel.statistics.combatProfile.details.ratingPerBattle",
                  {
                    value: formatSignedBattleMetric(
                      perBattle(summary.totalRatingDelta),
                    ),
                  },
                )
              : loadingDetail
          }
        />
      ) : (
        <StatsTile
          icon={Award}
          label={t("battlePanel.statistics.combatProfile.cards.honorPoints")}
          value={
            summary ? formatBattleMetric(summary.totalPH) : loading("w-16")
          }
          detail={
            summary
              ? t("battlePanel.statistics.combatProfile.details.perBattle", {
                  value: formatBattleMetric(perBattle(summary.totalPH)),
                })
              : loadingDetail
          }
        />
      )}
      <StatsTile
        icon={Hourglass}
        label={t("battlePanel.statistics.combatProfile.cards.turns")}
        value={summary ? formatBattleMetric(summary.avgTurns) : loading("w-14")}
        detail={
          summary
            ? t("battlePanel.statistics.combatProfile.details.duration", {
                value: formatDurationCompact(Math.round(summary.avgDuration)),
              })
            : loadingDetail
        }
      />
      <StatsTile
        icon={Sword}
        label={t("battlePanel.statistics.combatProfile.cards.damage")}
        value={
          summary
            ? compactFormatter.format(summary.damagePerTurn)
            : loading("w-16")
        }
        detail={t("battlePanel.statistics.combatProfile.details.damage")}
      />
      <StatsTile
        icon={Crosshair}
        label={t("battlePanel.statistics.combatProfile.cards.control")}
        value={
          summary
            ? `${formatBattleMetric(summary.controlRate)}%`
            : loading("w-14")
        }
        detail={t("battlePanel.statistics.combatProfile.details.control")}
      />
    </StatsTileGrid>
  );
}
