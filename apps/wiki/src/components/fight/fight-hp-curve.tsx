import { cn } from "cn";
import { t } from "@/i18n/messages";
import type { HpBand } from "@/lib/fight/fight-summary";
import { FightChartAxis } from "./fight-chart-axis";
import { FIGHT_SIDES } from "./fight-sides";
import { formatShare } from "./fight-stat-rows";

const GRID_SHARES = [1, 0.5, 0] as const;

const pathOf = (points: readonly (readonly [number, number])[]) =>
  points.map(([x, y]) => `${x} ${y}`).join(" L");

export function FightHpCurve({
  moves,
}: {
  moves: readonly (readonly HpBand[])[];
}) {
  const last = Math.max(1, moves.length - 1);

  const point = (move: number, share: number) =>
    [(move / last) * 100, 100 - share * 100] as const;

  const edge = (fighter: number, read: (band: HpBand) => number) =>
    moves.map((bands, move) => {
      const band = bands[fighter];

      return point(move, band ? read(band) : 0);
    });

  const finalShare = (fighter: number) =>
    formatShare(moves.at(-1)?.[fighter]?.median ?? 0);

  return (
    <figure className="flex h-full min-h-0 flex-col gap-1">
      <div
        role="img"
        aria-label={t("fightPage.hpCurveLabel", {
          mine: finalShare(0),
          theirs: finalShare(1),
        })}
        className="relative min-h-32 flex-1"
      >
        <div className="absolute inset-0 flex flex-col justify-between">
          {GRID_SHARES.map((share) => (
            <span
              key={share}
              className="border-t border-border/50 text-[0.6875rem] leading-none text-muted-foreground tabular-nums"
            >
              {formatShare(share)}
            </span>
          ))}
        </div>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
        >
          {FIGHT_SIDES.map((side, fighter) => (
            <path
              key={side.band}
              d={`M${pathOf([
                ...edge(fighter, (band) => band.high),
                ...edge(fighter, (band) => band.low).reverse(),
              ])} Z`}
              className={side.band}
            />
          ))}
          {FIGHT_SIDES.map((side, fighter) => (
            <path
              key={side.line}
              d={`M${pathOf(edge(fighter, (band) => band.median))}`}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth={2}
              className={cn(side.line)}
            />
          ))}
        </svg>
      </div>
      <FightChartAxis
        ticks={[1, Math.ceil(moves.length / 2), Math.max(1, moves.length)]}
        unit={t("fightPage.moveAxis")}
      />
    </figure>
  );
}
