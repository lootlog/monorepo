import { formatNumber } from "@lootlog/domain/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { t } from "@/i18n/messages";
import type { WinnerHpBucket } from "@/lib/fight/fight-highlights";
import { FightChartAxis } from "./fight-chart-axis";
import { formatShare } from "./fight-stat-rows";

const OUTCOMES = [
  { id: "won", className: "bg-signal-ready" },
  { id: "lost", className: "bg-signal-alert" },
] as const;

const AXIS_TICKS = [0, 50, 100] as const;

export function FightWinnerHpChart({
  buckets,
}: {
  buckets: readonly WinnerHpBucket[];
}) {
  const tallest = Math.max(
    1,
    ...buckets.map(({ wins }) => wins.reduce((sum, count) => sum + count, 0)),
  );

  return (
    <figure className="flex h-full min-h-0 flex-col gap-1">
      <div className="flex min-h-32 flex-1 items-end gap-0.5 border-b border-border">
        {buckets.map((bucket) => {
          const range = `${formatShare(bucket.from)}–${formatShare(bucket.to)}`;

          return (
            <Tooltip key={bucket.from}>
              <TooltipTrigger
                render={<div tabIndex={0} />}
                aria-label={t("fightPage.winnerHpBarLabel", {
                  range,
                  won: formatNumber(bucket.wins[0] ?? 0),
                  lost: formatNumber(bucket.wins[1] ?? 0),
                })}
                className="flex h-full min-w-0 flex-1 flex-col-reverse rounded-t-xs outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {OUTCOMES.map((outcome, team) => (
                  <span
                    key={outcome.id}
                    className={outcome.className}
                    style={{
                      height: `${((bucket.wins[team] ?? 0) / tallest) * 100}%`,
                    }}
                  />
                ))}
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-0.5 tabular-nums">
                  <span className="font-semibold">{range}</span>
                  {OUTCOMES.map((outcome, team) => (
                    <span key={outcome.id}>
                      {t(`fightPage.${outcome.id}`)}:{" "}
                      {formatNumber(bucket.wins[team] ?? 0)}
                    </span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <FightChartAxis ticks={AXIS_TICKS} unit={t("fightPage.winnerHpAxis")} />
    </figure>
  );
}
