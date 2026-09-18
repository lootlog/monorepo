import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { formatDurationCompact } from "@/features/guild/events/utils/format-duration";
import { KpiCard } from "@/components/common/kpi-card";
import type { CombatProfileResponseDtoOutput } from "@lootlog/client/battlelog";
import { Award, Crosshair, Hourglass, Sword, Trophy } from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";

type CombatProfileOverviewProps = {
  data: CombatProfileResponseDtoOutput | undefined;
  isLoading: boolean;
  /** The Abyss page already shows the season record above its tabs. */
  showRecord?: boolean;
};

const numberFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("pl-PL", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const signedFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const formatNumber = (value: number): string => numberFormatter.format(value);

const EMPTY_SUMMARY: CombatProfileResponseDtoOutput["summary"] = {
  totalBattles: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  totalPH: 0,
  totalRatingDelta: 0,
  avgTurns: 0,
  avgDuration: 0,
  damagePerTurn: 0,
  mitigationRate: 0,
  controlRate: 0,
};

export function CombatProfileOverview({
  data,
  isLoading,
  showRecord = true,
}: CombatProfileOverviewProps) {
  const { t } = useTranslation();
  const summary = data?.summary ?? EMPTY_SUMMARY;

  const honorPointsPerBattle =
    summary.totalBattles > 0 ? summary.totalPH / summary.totalBattles : 0;

  const kpis = [
    {
      key: "record",
      icon: Trophy,
      label: t("battlePanel.statistics.combatProfile.cards.record"),
      value: (
        <>
          <span className={BATTLE_TEXT_COLORS.result.won}>{summary.wins}</span>
          <span className="px-1.5 text-muted-foreground">–</span>
          <span className={BATTLE_TEXT_COLORS.result.lost}>
            {summary.losses}
          </span>
        </>
      ),
      detail: t("battlePanel.statistics.combatProfile.details.winRate", {
        value: formatNumber(summary.winRate),
      }),
    },
    {
      key: "honorPoints",
      icon: Award,
      label: t("battlePanel.statistics.combatProfile.cards.honorPoints"),
      value: formatNumber(summary.totalPH),
      // Rating only changes in Abyss battles, so outside of them the average says more.
      detail: summary.totalRatingDelta
        ? t("battlePanel.statistics.combatProfile.details.rating", {
            value: signedFormatter.format(summary.totalRatingDelta),
          })
        : t("battlePanel.statistics.combatProfile.details.perBattle", {
            value: formatNumber(honorPointsPerBattle),
          }),
    },
    {
      key: "turns",
      icon: Hourglass,
      label: t("battlePanel.statistics.combatProfile.cards.turns"),
      value: formatNumber(summary.avgTurns),
      detail: t("battlePanel.statistics.combatProfile.details.duration", {
        value: formatDurationCompact(Math.round(summary.avgDuration)),
      }),
    },
    {
      key: "damage",
      icon: Sword,
      label: t("battlePanel.statistics.combatProfile.cards.damage"),
      value: compactFormatter.format(summary.damagePerTurn),
      detail: t("battlePanel.statistics.combatProfile.details.damage"),
    },
    {
      key: "control",
      icon: Crosshair,
      label: t("battlePanel.statistics.combatProfile.cards.control"),
      value: `${formatNumber(summary.controlRate)}%`,
      detail: t("battlePanel.statistics.combatProfile.details.control"),
    },
  ];

  const visibleKpis = showRecord
    ? kpis
    : kpis.filter((kpi) => kpi.key !== "record");

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        showRecord ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {visibleKpis.map((kpi) => (
        <KpiCard
          // An odd number of tiles in two columns would leave the last one orphaned.
          className={
            visibleKpis.length % 2 === 1
              ? "last:col-span-2 lg:last:col-span-1"
              : undefined
          }
          key={kpi.key}
          icon={kpi.icon}
          label={kpi.label}
          value={kpi.value}
          detail={kpi.detail}
          isLoading={isLoading || !data}
        />
      ))}
    </div>
  );
}
