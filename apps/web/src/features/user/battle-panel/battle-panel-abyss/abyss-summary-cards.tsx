import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { BattlePanelKpiCard } from "@/features/user/battle-panel/components/battle-panel-kpi-card";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { Crown, Percent, Sparkles, Swords, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatAbyssNumber, formatAbyssSignedNumber } from "./abyss-formatters";

type AbyssSummaryCardsProps = {
  isLoading?: boolean;
  season?: AbyssSeason;
};

const getOptionalAbyssMetric = (value: number | null | undefined) =>
  value === null || value === undefined ? "–" : formatAbyssNumber(value);

export function AbyssSummaryCards({
  isLoading,
  season,
}: AbyssSummaryCardsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      key: "record",
      icon: Swords,
      label: t("battlePanel.abyss.cards.record"),
      value: (
        <>
          <span className={BATTLE_TEXT_COLORS.result.won}>
            {season?.wins ?? 0}
          </span>
          <span className="px-1.5 text-muted-foreground">–</span>
          <span className={BATTLE_TEXT_COLORS.result.lost}>
            {season?.losses ?? 0}
          </span>
        </>
      ),
      detail: t("battlePanel.abyss.stats.totalBattles", {
        count: season?.totalBattles ?? 0,
      }),
    },
    {
      key: "winRate",
      icon: Percent,
      label: t("battlePanel.abyss.cards.winRate"),
      value: `${formatAbyssNumber(season?.winRate ?? 0)}%`,
      detail: t("battlePanel.abyss.details.winRate"),
    },
    {
      key: "rating",
      icon: TrendingUp,
      label: t("battlePanel.abyss.cards.rating"),
      value: formatAbyssSignedNumber(season?.totalRatingDelta ?? 0),
      valueClassName:
        (season?.totalRatingDelta ?? 0) >= 0
          ? BATTLE_TEXT_COLORS.result.won
          : BATTLE_TEXT_COLORS.result.lost,
      detail: t("battlePanel.abyss.details.rating"),
    },
    {
      key: "peakRating",
      icon: Crown,
      label: t("battlePanel.abyss.cards.peakRating"),
      value: getOptionalAbyssMetric(season?.peakRating),
      detail: t("battlePanel.abyss.details.peakRating"),
    },
    {
      key: "points",
      icon: Sparkles,
      label: t("battlePanel.abyss.cards.points"),
      value: getOptionalAbyssMetric(season?.totalPointsGained),
      detail:
        season?.totalPointsGained === null
          ? t("battlePanel.abyss.pointsUnavailable")
          : t("battlePanel.abyss.details.points"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card) => (
        <BattlePanelKpiCard
          // Five tiles in two columns would leave the last one orphaned.
          className="last:col-span-2 lg:last:col-span-1"
          key={card.key}
          icon={card.icon}
          label={card.label}
          value={card.value}
          valueClassName={card.valueClassName}
          detail={card.detail}
          isLoading={isLoading || !season}
        />
      ))}
    </div>
  );
}
