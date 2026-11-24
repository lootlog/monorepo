import type { BattleTimelineResponseDtoOutput } from "@lootlog/client/battlelog";
import { BATTLE_HEX_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
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
  type BattleHpTimelineSeriesValues,
  type BattleHpTimelineTooltipSeries,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-tooltip";
import {
  getBattleHpTimelinePlayerTeam,
  getBattleHpTimelineTeamColor,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-colors";
import {
  buildBattleHpTimelineGroupTeams,
  getBattleHpTimelineGroupSeries,
  type BattleHpTimelineGroupSelection,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-group-series";
import { BattleHpTimelineSeriesSwatch } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-series-swatch";
import { useBattleHpTimelineTeamLabel } from "@/features/user/battle-panel/battle-panel-single-battle/components/use-battle-hp-timeline-team-label";
import {
  BATTLE_HP_TIMELINE_LAYER_DEFINITION_BY_KEY,
  type BattleHpTimelineLayerConfig,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-layers";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { cn } from "cn";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
// oxlint-disable-next-line react-doctor/prefer-dynamic-import -- This chart implementation is loaded only by its lazy wrapper; Recharts stays inside that async boundary.
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_SERIES_ANIMATION } from "@/lib/motion";

type BattleHpTimelinePlotProps = {
  timeline: BattleTimelineResponseDtoOutput["timeline"];
  warriors: BattleTimelineResponseDtoOutput["warriors"];
  characterId: string | null;
  groupSelection: BattleHpTimelineGroupSelection | null;
  layers: BattleHpTimelineLayerConfig;
  selectedTurn: number | null;
  compact: boolean;
  className?: string;
  onTurnSelect: (turn: number) => void;
};

const getTeamValue = (data: BattleHpTimelineSeriesValues, team: number) =>
  team === 1 ? data.team1 : data.team2;

export function BattleHpTimelinePlot({
  timeline,
  warriors,
  characterId,
  groupSelection,
  layers,
  selectedTurn,
  compact,
  className,
  onTurnSelect,
}: BattleHpTimelinePlotProps) {
  const { t } = useTranslation();
  const chartRootRef = useRef<HTMLDivElement | null>(null);
  const playerTeam = getBattleHpTimelinePlayerTeam(warriors, characterId);
  const getTeamLabel = useBattleHpTimelineTeamLabel(warriors, characterId);

  const series: BattleHpTimelineTooltipSeries[] =
    groupSelection === null
      ? [1, 2].map((team) => ({
          key: `team${team}`,
          label: getTeamLabel(team),
          color: getBattleHpTimelineTeamColor(team, playerTeam),
          isAverage: false,
          getValue: (data) => getTeamValue(data, team),
        }))
      : getBattleHpTimelineGroupSeries(
          buildBattleHpTimelineGroupTeams(warriors, characterId),
          groupSelection,
        ).map((item) =>
          item.kind === "average"
            ? {
                key: item.key,
                label: t("battlePanel.single.chart.group.teamAverage", {
                  team: getTeamLabel(item.team),
                }),
                color: item.color,
                isAverage: true,
                getValue: (data) => getTeamValue(data, item.team),
              }
            : {
                key: item.key,
                label: item.member.name,
                color: item.color,
                isAverage: false,
                getValue: (data) => data.warriorHp[item.member.warriorId],
              },
        );

  const lineSeries = [...series].sort(
    (left, right) => Number(right.isAverage) - Number(left.isAverage),
  );

  const chartConfig = {
    ...Object.fromEntries(
      series.map((item) => [
        item.key,
        { label: item.label, color: item.color },
      ]),
    ),
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
            recipient: bonus.recipientName ?? getTeamLabel(group.team),
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
    <>
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
            content=<BattleHpTimelineTooltipContent
              chartRootRef={chartRootRef}
              series={series}
              getTeamLabel={getTeamLabel}
            />
          />
          {selectedTurn !== null ? (
            <ReferenceLine
              x={selectedTurn}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
            />
          ) : null}
          {lineSeries.map((item) => (
            <Line
              {...CHART_SERIES_ANIMATION}
              key={item.key}
              name={item.label}
              dataKey={item.getValue}
              type="monotone"
              stroke={item.color}
              strokeWidth={item.isAverage ? 1.5 : 2}
              strokeDasharray={item.isAverage ? "5 4" : undefined}
              dot=<BattleHpTimelinePoint onTurnSelect={onTurnSelect} />
              activeDot=<BattleHpTimelinePoint
                visible
                onTurnSelect={onTurnSelect}
              />
            />
          ))}
          {legendaryMarkerGroups.map((group) => (
            <ReferenceDot
              key={group.key}
              ifOverflow="visible"
              r={0}
              shape={(markerCoordinates) => (
                <BattleHpTimelineLegendaryMarker
                  cx={markerCoordinates.cx}
                  cy={markerCoordinates.cy}
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
              shape={(markerCoordinates) => (
                <BattleHpTimelineEventMarker
                  cx={markerCoordinates.cx}
                  cy={markerCoordinates.cy}
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
      {groupSelection === null ? null : (
        <ul
          aria-label={t("battlePanel.single.chart.group.legendLabel")}
          className="mt-2 flex shrink-0 flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
        >
          {series.map((item) => (
            <li key={item.key} className="flex min-w-0 items-center gap-1.5">
              <BattleHpTimelineSeriesSwatch
                color={item.color}
                isAverage={item.isAverage}
              />
              <span className="max-w-40 truncate">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
