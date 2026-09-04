import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { cn } from "cn";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  formatBattleHpTimelineTooltipNumber,
  getBattleHpTimelineTooltipPayload,
  type BattleHpTimelineTooltipDeltaKey,
} from "./battle-hp-timeline-tooltip";

type BattleHpTimelineTooltipPayloadItem = {
  payload?: unknown;
};

type BattleHpTimelineTooltipCoordinate = {
  x?: number;
  y?: number;
};

type BattleHpTimelineTooltipContentProps = {
  active?: boolean;
  chartRootRef: RefObject<HTMLDivElement | null>;
  coordinate?: BattleHpTimelineTooltipCoordinate;
  payload?: BattleHpTimelineTooltipPayloadItem[];
  team1Color: string;
  team1Label: string;
  team2Color: string;
  team2Label: string;
};

const deltaClassNameByKey = {
  damage: "text-rose-500",
  healing: "text-emerald-500",
  mitigation: "text-sky-500",
} satisfies Record<BattleHpTimelineTooltipDeltaKey, string>;

export function BattleHpTimelineTooltipContent({
  active,
  chartRootRef,
  coordinate,
  payload,
  team1Color,
  team1Label,
  team2Color,
  team2Label,
}: BattleHpTimelineTooltipContentProps) {
  const { i18n, t } = useTranslation();
  const tooltipData = getBattleHpTimelineTooltipPayload(payload?.[0]?.payload);
  const [chartRoot, setChartRoot] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    setChartRoot(chartRootRef.current);
  }, [active, chartRootRef]);

  if (!active || !tooltipData) {
    return null;
  }

  const locale = i18n.language || "pl-PL";
  const formatNumber = (value: number) =>
    formatBattleHpTimelineTooltipNumber(value, locale);
  const formatPercent = (value: number) => `${formatNumber(value)}%`;
  const tooltipPanel = (
    <div className="pointer-events-none grid min-w-[15rem] max-w-[min(19rem,calc(100dvw-1rem))] gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-xs shadow-xl">
      <div>
        <p className="font-semibold leading-none text-foreground">
          {t("battlePanel.single.chart.turnTooltip", {
            turn: tooltipData.turn,
          })}
        </p>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: team1Color }}
            />
            <span className="truncate">{team1Label}</span>
          </span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {formatPercent(tooltipData.team1)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: team2Color }}
            />
            <span className="truncate">{team2Label}</span>
          </span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {formatPercent(tooltipData.team2)}
          </span>
        </div>
      </div>

      {tooltipData.deltas.length > 0 ? (
        <div className="grid gap-1.5 border-t border-border/60 pt-2">
          <p className="text-[11px] font-medium uppercase text-muted-foreground">
            {t("battlePanel.single.chart.tooltip.deltas")}
          </p>
          {tooltipData.deltas.map((delta) => (
            <div
              key={delta.key}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground">{t(delta.labelKey)}</span>
              <span
                className={cn(
                  "font-mono font-medium tabular-nums",
                  deltaClassNameByKey[delta.key],
                )}
              >
                {formatNumber(delta.value)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {tooltipData.legendaryBonuses.length > 0 ? (
        <div className="grid gap-1.5 border-t border-border/60 pt-2">
          <p className="text-[11px] font-medium uppercase text-muted-foreground">
            {t("battlePanel.single.chart.legendary.title")}
          </p>
          {tooltipData.legendaryBonuses.map((bonus, index) => (
            <div
              key={`${bonus.labelKey}:${bonus.recipientName ?? bonus.team}:${index}`}
              className="flex min-w-0 items-center gap-1.5 text-muted-foreground"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: bonus.color }}
              />
              <span className="truncate">
                {t("battlePanel.single.chart.legendary.bonusRecipient", {
                  bonus: t(bonus.labelKey),
                  recipient:
                    bonus.recipientName ??
                    (bonus.team === 1 ? team1Label : team2Label),
                })}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {tooltipData.flagLabelKeys.length > 0 ? (
        <div className="flex flex-wrap gap-1 border-t border-border/60 pt-2">
          {tooltipData.flagLabelKeys.map((labelKey) => (
            <span
              key={labelKey}
              className="rounded-sm border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground"
            >
              {t(labelKey)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (!chartRoot || !coordinate || typeof document === "undefined") {
    return tooltipPanel;
  }

  const coordinateX = Number(coordinate.x);
  const coordinateY = Number(coordinate.y);

  if (Number.isNaN(coordinateX) || Number.isNaN(coordinateY)) {
    return tooltipPanel;
  }

  const chartBounds = chartRoot.getBoundingClientRect();
  const opensLeft = coordinateX > chartBounds.width / 2;
  const opensAbove = coordinateY > chartBounds.height / 2;
  const portalStyle: CSSProperties = {
    left: chartBounds.left + coordinateX + (opensLeft ? -12 : 12),
    position: "fixed",
    top: chartBounds.top + coordinateY + (opensAbove ? -12 : 12),
    transform: [
      opensLeft ? "translateX(-100%)" : "",
      opensAbove ? "translateY(-100%)" : "",
    ]
      .filter(Boolean)
      .join(" "),
    zIndex: 80,
  };

  return createPortal(
    <div style={portalStyle}>{tooltipPanel}</div>,
    document.body,
  );
}
