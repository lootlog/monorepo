import type { BattleTimelineResponseDtoOutput } from "@/lib/api/generated/battlelog/model";
import { BattleHpTimelineLegendaryLegendItem } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-legend-item";
import { BattleHpTimelineLegendaryMarker } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-marker";
import {
  buildLegendaryBonusMarkerGroups,
  getLegendaryBonusLegendItems,
  type LegendaryBonusMarkerGroup,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-markers";
import { BattleHpTimelinePoint } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-point";
import {
  getBattleHpTimelinePlayerTeam,
  getBattleHpTimelineTeamColor,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-colors";
import { getBattleHpTimelineTeamLabel } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-labels";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Card } from "@lootlog/ui/components/card";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type BattleHpTimelineChartProps = {
  timeline: BattleTimelineResponseDtoOutput["timeline"];
  warriors: BattleTimelineResponseDtoOutput["warriors"];
  characterId: string | null;
  isPinned: boolean;
  selectedTurn: number | null;
  onPinnedChange: (isPinned: boolean) => void;
  onTurnSelect: (turn: number) => void;
};

export function BattleHpTimelineChart({
  timeline,
  warriors,
  characterId,
  isPinned,
  selectedTurn,
  onPinnedChange,
  onTurnSelect,
}: BattleHpTimelineChartProps) {
  const { t } = useTranslation();
  const playerTeam = getBattleHpTimelinePlayerTeam(warriors, characterId);
  const team1Color = getBattleHpTimelineTeamColor(1, playerTeam);
  const team2Color = getBattleHpTimelineTeamColor(2, playerTeam);
  const team1Label = getBattleHpTimelineTeamLabel(
    warriors,
    1,
    t("battlePanel.single.chart.team", { team: 1 }),
  );
  const team2Label = getBattleHpTimelineTeamLabel(
    warriors,
    2,
    t("battlePanel.single.chart.team", { team: 2 }),
  );
  const chartConfig = {
    team1: {
      label: team1Label,
      color: team1Color,
    },
    team2: {
      label: team2Label,
      color: team2Color,
    },
    momentum: {
      label: t("battlePanel.single.chart.momentum"),
      color: "var(--chart-5)",
    },
  } satisfies ChartConfig;

  const chartData = timeline.map((turn) => {
    const team1 = turn.teamHp["1"] ?? 0;
    const team2 = turn.teamHp["2"] ?? 0;

    return {
      turn: turn.turn,
      team1,
      team2,
      momentum: Math.round((team1 - team2) * 100) / 100,
      reason: turn.reason,
    };
  });
  const legendaryMarkerGroups = buildLegendaryBonusMarkerGroups(
    timeline,
    warriors,
  );
  const legendaryLegendItems = getLegendaryBonusLegendItems(
    legendaryMarkerGroups,
  );

  const getLegendaryMarkerLabel = (group: LegendaryBonusMarkerGroup) =>
    t("battlePanel.single.chart.legendary.groupLabel", {
      turn: group.turn,
      bonuses: group.bonuses
        .map((bonus) =>
          t("battlePanel.single.chart.legendary.bonusRecipient", {
            bonus: t(bonus.labelKey),
            recipient:
              bonus.recipientName ??
              (group.team === 1 ? team1Label : team2Label),
          }),
        )
        .join(", "),
    });

  return (
    <Card className="gap-3 border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <div>
            <h2 className="text-base font-semibold leading-tight">
              {t("battlePanel.single.chart.title")}
            </h2>
            <p className="text-xs leading-tight text-muted-foreground">
              {t("battlePanel.single.chart.description")}
            </p>
          </div>
        </div>
        <label
          className="inline-flex h-8 cursor-pointer select-none items-center gap-2 rounded-sm border border-border bg-background px-2.5 text-sm text-foreground"
          htmlFor="battle-hp-timeline-pin"
        >
          <Checkbox
            id="battle-hp-timeline-pin"
            checked={isPinned}
            onCheckedChange={(checked) => onPinnedChange(checked === true)}
          />
          {t("battlePanel.single.chart.pin")}
        </label>
      </div>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: -24,
            right: 16,
            top: 16,
            bottom: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="turn"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(value) =>
                  t("battlePanel.single.chart.turnTooltip", { turn: value })
                }
              />
            }
          />
          {selectedTurn && (
            <ReferenceLine
              x={selectedTurn}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
            />
          )}
          <Line
            dataKey="team1"
            type="monotone"
            stroke="var(--color-team1)"
            strokeWidth={2}
            dot={<BattleHpTimelinePoint onTurnSelect={onTurnSelect} />}
            activeDot={
              <BattleHpTimelinePoint visible onTurnSelect={onTurnSelect} />
            }
          />
          <Line
            dataKey="team2"
            type="monotone"
            stroke="var(--color-team2)"
            strokeWidth={2}
            dot={<BattleHpTimelinePoint onTurnSelect={onTurnSelect} />}
            activeDot={
              <BattleHpTimelinePoint visible onTurnSelect={onTurnSelect} />
            }
          />
          {legendaryMarkerGroups.map((group) => (
            <ReferenceDot
              key={group.key}
              ifOverflow="visible"
              r={0}
              shape={(shapeProps) => (
                <BattleHpTimelineLegendaryMarker
                  cx={shapeProps.cx}
                  cy={shapeProps.cy}
                  group={group}
                  label={getLegendaryMarkerLabel(group)}
                  onTurnSelect={onTurnSelect}
                />
              )}
              x={group.turn}
              y={group.y}
            />
          ))}
        </LineChart>
      </ChartContainer>
      {legendaryLegendItems.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("battlePanel.single.chart.legendary.title")}
          </span>
          {legendaryLegendItems.map((item) => (
            <BattleHpTimelineLegendaryLegendItem
              key={item.type}
              item={item}
              label={t(item.labelKey)}
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
