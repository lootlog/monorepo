import { formatNumber } from "@lootlog/domain/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { t } from "@/i18n/messages";
import type { FightSummary } from "@/lib/fight/fight-summary";

const OUTCOMES = [
  { id: "won", className: "bg-signal-ready" },
  { id: "lost", className: "bg-signal-alert" },
  { id: "drawn", className: "bg-muted-foreground/40" },
] as const;

const countsOf = (bucket: FightSummary["lengths"][number]) => ({
  won: bucket.wins[0] ?? 0,
  lost: bucket.wins[1] ?? 0,
  drawn: bucket.draws,
});

const bucketLabel = (bucket: FightSummary["lengths"][number]) =>
  bucket.from === bucket.to
    ? `${formatNumber(bucket.from)} ${t("fightPage.lengthMoves")}`
    : t("fightPage.lengthBucket", {
        from: formatNumber(bucket.from),
        to: formatNumber(bucket.to),
      });

export function FightLengthChart({ summary }: { summary: FightSummary }) {
  const { lengths, moves } = summary;

  const tallest = Math.max(
    1,
    ...lengths.map(({ wins, draws }) =>
      wins.reduce((total, count) => total + count, draws),
    ),
  );

  return (
    <figure className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={t("fightPage.averageMovesDetail", {
          median: formatNumber(moves.median),
          p10: formatNumber(moves.p10),
          p90: formatNumber(moves.p90),
        })}
        className="flex h-36 items-end gap-0.5 border-b border-border"
      >
        {lengths.map((bucket) => {
          const counts = countsOf(bucket);

          return (
            <Tooltip key={bucket.from}>
              <TooltipTrigger
                render={<div />}
                className="flex h-full min-w-0 flex-1 flex-col-reverse hover:opacity-80"
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
                className={`size-2 rounded-xs ${outcome.className}`}
              />
              {t(`fightPage.${outcome.id}`)}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
