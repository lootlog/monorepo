import type { BattleTimelineResponseDtoOutput } from "@lootlog/client/battlelog";
import { BATTLE_HEX_COLORS } from "@/components/battle/utils/battle-color-palette";
import { BattleHpTimelineEventMarker } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-event-marker";
import {
  buildBattleHpTimelineEventMarkerGroups,
  type BattleHpTimelineEventMarkerGroup,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-event-markers";
import { BattleHpTimelineLegendaryMarker } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-marker";
import {
  buildLegendaryBonusMarkerGroups,
  type LegendaryBonusMarkerGroup,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-markers";
import { BattleHpTimelinePoint } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-point";
import { BattleHpTimelineTooltipContent } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-tooltip-content";
import {
  buildBattleHpTimelineTooltipData,
  buildBattleHpTimelineTooltipLegendaryBonusesByTurn,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-tooltip";
import {
  getBattleHpTimelinePlayerTeam,
  getBattleHpTimelineTeamColor,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-colors";
import { getBattleHpTimelineTeamLabel } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-labels";
import {
  BATTLE_HP_TIMELINE_LAYER_DEFINITION_BY_KEY,
  type BattleHpTimelineLayerConfig,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-layers";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { cn } from "@lootlog/ui/lib/utils";
import { useRef } from "react";
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

type BattleHpTimelinePlotProps = {
  timeline: BattleTimelineResponseDtoOutput["timeline"];
  warriors: BattleTimelineResponseDtoOutput["warriors"];
  characterId: string | null;
  layers: BattleHpTimelineLayerConfig;
  selectedTurn: number | null;
  compact: boolean;
  className?: string;
  onTurnSelect: (turn: number) => void;
};

export function BattleHpTimelinePlot({
  timeline,
  warriors,
  characterId,
  layers,
  selectedTurn,
  compact,
  className,
  onTurnSelect,
}: BattleHpTimelinePlotProps) {
  const { t } = useTranslation();
  const chartRootRef = useRef<HTMLDivElement | null>(null);
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
      color: BATTLE_HEX_COLORS.chart.momentum,
    },
  } satisfies ChartConfig;
  const tooltipLegendaryMarkerGroups = buildLegendaryBonusMarkerGroups(
    timeline,
    warriors,
    { includeChartHidden: true },
  );
  const allLegendaryMarkerGroups = buildLegendaryBonusMarkerGroups(
    timeline,
    warriors,
  );
  const legendaryBonusesByTurn =
    buildBattleHpTimelineTooltipLegendaryBonusesByTurn(
      tooltipLegendaryMarkerGroups,
    );
  const chartData = timeline.map((turn) =>
    buildBattleHpTimelineTooltipData(
      turn,
      legendaryBonusesByTurn.get(turn.turn) ?? [],
    ),
  );
  const legendaryMarkerGroups = layers.legendary
    ? allLegendaryMarkerGroups
    : [];
  const eventMarkerGroups = buildBattleHpTimelineEventMarkerGroups(
    timeline,
    warriors,
    layers,
  );
  const chartMargin = compact
    ? { left: -24, right: 16, top: 8, bottom: 6 }
    : { left: -12, right: 28, top: 22, bottom: 18 };

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

  const getEventMarkerLabel = (group: BattleHpTimelineEventMarkerGroup) =>
    t("battlePanel.single.chart.events.groupLabel", {
      turn: group.turn,
      events: group.markers
        .map((marker) => {
          const definition =
            BATTLE_HP_TIMELINE_LAYER_DEFINITION_BY_KEY[marker.key];
          const label = t(definition.labelKey);

          if (marker.count <= 1) {
            return label;
          }

          return t("battlePanel.single.chart.events.eventCount", {
            event: label,
            count: marker.count,
          });
        })
        .join(", "),
    });

  return (
    <ChartContainer
      ref={chartRootRef}
      config={chartConfig}
      className={cn(
        "w-full overflow-visible [&_.recharts-wrapper]:overflow-visible",
        className,
      )}
    >
      <LineChart accessibilityLayer data={chartData} margin={chartMargin}>
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
          allowEscapeViewBox={{ x: true, y: true }}
          cursor={false}
          wrapperStyle={{ zIndex: 30 }}
          content={
            <BattleHpTimelineTooltipContent
              chartRootRef={chartRootRef}
              team1Color={team1Color}
              team1Label={team1Label}
              team2Color={team2Color}
              team2Label={team2Label}
            />
          }
        />
        {selectedTurn !== null ? (
          <ReferenceLine
            x={selectedTurn}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
          />
        ) : null}
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
        {eventMarkerGroups.map((group) => (
          <ReferenceDot
            key={group.key}
            ifOverflow="visible"
            r={0}
            shape={(shapeProps) => (
              <BattleHpTimelineEventMarker
                cx={shapeProps.cx}
                cy={shapeProps.cy}
                group={group}
                label={getEventMarkerLabel(group)}
                onTurnSelect={onTurnSelect}
              />
            )}
            x={group.turn}
            y={group.y}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
