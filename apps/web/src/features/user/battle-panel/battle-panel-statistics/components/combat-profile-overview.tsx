import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import type { CombatProfileResponseDtoOutput } from "@lootlog/client/battlelog";
import { SectionCard } from "@/components/common/section-card/section-card";
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
      <SectionCard>
        <SectionCardContent>
          <p className="text-sm text-muted-foreground">
            {t("battlePanel.statistics.loading")}
          </p>
        </SectionCardContent>
      </SectionCard>
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
          <SectionCard key={kpi.key}>
            <SectionCardHeader icon={kpi.icon} title={kpi.label} />
            <SectionCardContent className="space-y-2">
              <div className="text-lg font-semibold leading-tight">
                {kpi.value}
              </div>
              <div className="text-xs text-muted-foreground">
                {kpi.subvalue}
              </div>
            </SectionCardContent>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
