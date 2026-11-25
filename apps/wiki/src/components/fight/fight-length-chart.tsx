import { cn } from "cn";
import { formatNumber } from "@lootlog/domain/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { t } from "@/i18n/messages";
import type {
  FightLengthBucket,
  FightSummary,
} from "@/lib/fight/fight-summary";

const OUTCOMES = [
  { id: "won", className: "bg-signal-ready" },
  { id: "lost", className: "bg-signal-alert" },
  { id: "drawn", className: "bg-muted-foreground/40" },
] as const;

const countsOf = (bucket: FightLengthBucket) => ({
  won: bucket.wins[0] ?? 0,
  lost: bucket.wins[1] ?? 0,
  drawn: bucket.draws,
});

const bucketLabel = (bucket: FightLengthBucket) =>
  bucket.from === bucket.to
    ? `${formatNumber(bucket.from)} ${t("fightPage.lengthMoves")}`
    : t("fightPage.lengthBucket", {
        from: formatNumber(bucket.from),
        to: formatNumber(bucket.to),
      });

type FightLengthChartProps = {
  summary: FightSummary;
  selected: { from: number; to: number } | null;
  onSelect: (lengths: { from: number; to: number }) => void;
};

export function FightLengthChart({
  summary,
  selected,
  onSelect,
}: FightLengthChartProps) {
  const { lengths, moves } = summary;

  const tallest = Math.max(
    1,
    ...lengths.map(({ wins, draws }) =>
      wins.reduce((total, count) => total + count, draws),
    ),
  );

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-40 items-end gap-0.5 border-b border-border">
        {lengths.map((bucket) => {
          const counts = countsOf(bucket);

          const isSelected =
            selected?.from === bucket.from && selected.to === bucket.to;

          return (
            <Tooltip key={bucket.from}>
              <TooltipTrigger
                render={<button type="button" />}
                aria-pressed={isSelected}
                aria-label={t("fightPage.lengthBarLabel", {
                  bucket: bucketLabel(bucket),
                  won: formatNumber(counts.won),
                  lost: formatNumber(counts.lost),
                  drawn: formatNumber(counts.drawn),
                })}
                onClick={() => onSelect({ from: bucket.from, to: bucket.to })}
                className={cn(
                  "flex h-full min-w-0 flex-1 cursor-pointer flex-col-reverse rounded-t-xs outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected && "bg-accent",
                  selected && !isSelected && "opacity-45",
                )}
              >
                {OUTCOMES.map((outcome) => (
                  <span
                    key={outcome.id}
                    className={outcome.className}
                    style={{
                      height: `${(counts[outcome.id] / tallest) * 100}%`,
                    }}
                  />
                ))}
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-0.5 tabular-nums">
                  <span className="font-semibold">{bucketLabel(bucket)}</span>
                  {OUTCOMES.map((outcome) => (
                    <span key={outcome.id}>
                      {t(`fightPage.${outcome.id}`)}:{" "}
                      {formatNumber(counts[outcome.id])}
                    </span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
        <span>
          {formatNumber(moves.shortest)}–{formatNumber(moves.longest)}{" "}
          {t("fightPage.lengthMoves")}
        </span>
        <span className="flex flex-wrap gap-3">
          {OUTCOMES.map((outcome) => (
            <span key={outcome.id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-xs", outcome.className)}
              />
              {t(`fightPage.${outcome.id}`)}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
