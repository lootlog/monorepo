import type { CombatProfileResponseDtoOutput } from "@lootlog/api-client/models/battlelog/combat-profile-response-dto-output";
import { Card } from "@lootlog/ui/components/card";
import {
  Clock,
  Crosshair,
  Shield,
  Sparkles,
  Sword,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type CombatProfileOverviewProps = {
  data: CombatProfileResponseDtoOutput | undefined;
  isLoading: boolean;
};

const numberFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("pl-PL", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatNumber = (value: number): string => numberFormatter.format(value);

export function CombatProfileOverview({
  data,
  isLoading,
}: CombatProfileOverviewProps) {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return (
      <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">
          {t("battlePanel.statistics.loading")}
        </p>
      </Card>
    );
  }

  const kpis = [
    {
      key: "record",
      icon: Trophy,
      label: t("battlePanel.statistics.combatProfile.cards.record"),
      value: `${data.summary.wins}W / ${data.summary.losses}L`,
      subvalue: `${formatNumber(data.summary.winRate)}%`,
    },
    {
      key: "phRating",
      icon: Sparkles,
      label: t("battlePanel.statistics.combatProfile.cards.phRating"),
      value: `${formatNumber(data.summary.totalPH)} PH`,
      subvalue: `${formatNumber(data.summary.totalRatingDelta)} rating`,
    },
    {
      key: "turns",
      icon: Clock,
      label: t("battlePanel.statistics.combatProfile.cards.turns"),
      value: formatNumber(data.summary.avgTurns),
      subvalue: `${formatNumber(data.summary.avgDuration / 1000)}s`,
    },
    {
      key: "damage",
      icon: Sword,
      label: t("battlePanel.statistics.combatProfile.cards.damage"),
      value: compactFormatter.format(data.summary.damagePerTurn),
      subvalue: t("battlePanel.statistics.combatProfile.perTurn"),
    },
    {
      key: "mitigation",
      icon: Shield,
      label: t("battlePanel.statistics.combatProfile.cards.mitigation"),
      value: `${formatNumber(data.summary.mitigationRate)}%`,
      subvalue: t("battlePanel.statistics.combatProfile.rate"),
    },
    {
      key: "control",
      icon: Crosshair,
      label: t("battlePanel.statistics.combatProfile.cards.control"),
      value: `${formatNumber(data.summary.controlRate)}%`,
      subvalue: t("battlePanel.statistics.combatProfile.rate"),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card
            key={kpi.key}
            className="gap-2 border-border bg-card/40 p-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kpi.icon className="size-3.5" />
              {kpi.label}
            </div>
            <div className="text-lg font-semibold leading-tight">
              {kpi.value}
            </div>
            <div className="text-xs text-muted-foreground">{kpi.subvalue}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
