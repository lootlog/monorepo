import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { Card } from "@lootlog/ui/components/card";
import { BarChart3, Crown, Sigma, Sparkles, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  formatAbyssNumber,
  formatAbyssSignedNumber,
  getAbyssSeasonRangeLabel,
} from "./abyss-formatters";

type AbyssSummaryCardsProps = {
  season?: AbyssSeason;
};

export function AbyssSummaryCards({ season }: AbyssSummaryCardsProps) {
  const { t } = useTranslation();
  const recordValue = season
    ? `${season.wins}${t("battlePanel.statistics.columns.w")} / ${
        season.losses
      }${t("battlePanel.statistics.columns.l")}`
    : `0${t("battlePanel.statistics.columns.w")} / 0${t(
        "battlePanel.statistics.columns.l",
      )}`;
  const cards = [
    {
      key: "record",
      icon: Swords,
      label: t("battlePanel.abyss.cards.record"),
      value: recordValue,
      subvalue: t("battlePanel.abyss.stats.totalBattles", {
        count: season?.totalBattles ?? 0,
      }),
    },
    {
      key: "winRate",
      icon: BarChart3,
      label: t("battlePanel.abyss.cards.winRate"),
      value: `${formatAbyssNumber(season?.winRate ?? 0)}%`,
      subvalue: season
        ? getAbyssSeasonRangeLabel(season)
        : t("battlePanel.abyss.noSeason"),
    },
    {
      key: "rating",
      icon: Sigma,
      label: t("battlePanel.abyss.cards.rating"),
      value: formatAbyssSignedNumber(season?.totalRatingDelta ?? 0),
      subvalue: t("battlePanel.abyss.stats.ratingDelta", {
        value: formatAbyssSignedNumber(season?.totalRatingDelta ?? 0),
      }),
    },
    {
      key: "peakRating",
      icon: Crown,
      label: t("battlePanel.abyss.cards.peakRating"),
      value:
        season?.peakRating === null || season?.peakRating === undefined
          ? "-"
          : formatAbyssNumber(season.peakRating),
      subvalue: t("battlePanel.abyss.season"),
    },
    {
      key: "points",
      icon: Sparkles,
      label: t("battlePanel.abyss.cards.points"),
      value:
        season?.totalPointsGained === null ||
        season?.totalPointsGained === undefined
          ? "-"
          : formatAbyssNumber(season.totalPointsGained),
      subvalue:
        season?.totalPointsGained === null ||
        season?.totalPointsGained === undefined
          ? t("battlePanel.abyss.pointsUnavailable")
          : t("battlePanel.abyss.stats.points", {
              value: formatAbyssNumber(season.totalPointsGained),
            }),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.key} className="gap-2 border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <card.icon className="size-3.5" />
            {card.label}
          </div>
          <div className="text-lg font-semibold leading-tight">
            {card.value}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {card.subvalue}
          </div>
        </Card>
      ))}
    </div>
  );
}
