import type { CombatProfileResponseDtoOutput } from "@/lib/api/generated/battlelog/model";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import {
  Activity,
  BarChart3,
  Clock,
  Crosshair,
  Shield,
  Sparkles,
  Sword,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

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
  const chartConfig = {
    value: {
      label: t("battlePanel.statistics.combatProfile.value"),
      color: "var(--chart-1)",
    },
    wins: {
      label: t("battlePanel.statistics.combatProfile.wins"),
      color: "var(--chart-2)",
    },
    losses: {
      label: t("battlePanel.statistics.combatProfile.losses"),
      color: "var(--chart-3)",
    },
    ph: {
      label: t("battlePanel.statistics.combatProfile.ph"),
      color: "var(--chart-4)",
    },
    rating: {
      label: t("battlePanel.statistics.combatProfile.rating"),
      color: "var(--chart-5)",
    },
  } satisfies ChartConfig;

  if (isLoading || !data) {
    return (
      <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">
          {t("battlePanel.statistics.loading")}
        </p>
      </Card>
    );
  }

  const damageMix = data.damageMix.slice(0, 8).map((item) => ({
    label: t(`battlePanel.statistics.combatProfile.damageTypes.${item.key}`, {
      defaultValue: item.label,
    }),
    value: item.value,
    share: item.share,
  }));
  const mitigationMix = data.mitigationMix.slice(0, 8).map((item) => ({
    label: t(
      `battlePanel.statistics.combatProfile.mitigationTypes.${item.key}`,
      {
        defaultValue: item.label,
      },
    ),
    value: item.value,
    share: item.share,
  }));
  const spellUsage = data.spellUsage.slice(0, 8).map((spell) => ({
    label: spell.spell,
    value: spell.casts,
    share: spell.share,
  }));
  const matchupByProfession = data.matchupByProfession.map((matchup) => ({
    label: t(`professions.${matchup.prof}`, { defaultValue: matchup.prof }),
    wins: matchup.wins,
    losses: matchup.losses,
    totalBattles: matchup.totalBattles,
  }));
  const trendData = data.phTrend.map((point, index) => {
    const ratingPoint = data.ratingTrend[index];
    return {
      label: new Date(point.date).toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
      }),
      ph: point.cumulativeValue,
      rating: ratingPoint?.cumulativeValue ?? 0,
    };
  });

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

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4 text-primary" />
            {t("battlePanel.statistics.combatProfile.damageMix")}
          </div>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={damageMix} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={compactFormatter.format}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="size-4 text-primary" />
            {t("battlePanel.statistics.combatProfile.mitigationMix")}
          </div>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={mitigationMix} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={compactFormatter.format}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="size-4 text-primary" />
            {t("battlePanel.statistics.combatProfile.spellUsage")}
          </div>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={spellUsage} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="size-4 text-primary" />
            {t("battlePanel.statistics.combatProfile.matchups")}
          </div>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart
              data={matchupByProfession}
              margin={{ left: -20, right: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="wins"
                stackId="record"
                fill="var(--color-wins)"
                radius={4}
              />
              <Bar
                dataKey="losses"
                stackId="record"
                fill="var(--color-losses)"
                radius={4}
              />
            </BarChart>
          </ChartContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="size-4 text-primary" />
            {t("battlePanel.statistics.combatProfile.trends")}
          </div>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart data={trendData} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="ph"
                stroke="var(--color-ph)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="rating"
                stroke="var(--color-rating)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </Card>

        <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            {t("battlePanel.statistics.combatProfile.highlights")}
          </div>
          <div className="space-y-2">
            {data.highlights.map((highlight) => (
              <div
                key={highlight.type}
                className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/50 p-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {t(
                      `battlePanel.statistics.combatProfile.highlightTypes.${highlight.type}`,
                      { defaultValue: highlight.label },
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(highlight.createdAt).toLocaleDateString("pl-PL")}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {compactFormatter.format(highlight.value)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
