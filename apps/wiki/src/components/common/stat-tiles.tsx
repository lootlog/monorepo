import { cn } from "cn";

type StatTile = {
  label: string;
  value: string;
  extra?: string | null;
  hint?: string;
};

type StatTilesProps = {
  tiles: ReadonlyArray<StatTile>;
  className?: string;
};

export function StatTiles({ tiles, className }: StatTilesProps) {
  return (
    <dl className={cn("grid grid-cols-3 gap-2", className)}>
      {tiles.map(({ label, value, extra, hint }) => (
        <div
          key={label}
          className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          <dt className="text-xs text-pretty text-muted-foreground">{label}</dt>
          <dd className="flex flex-col gap-0.5">
            <span className="flex items-baseline gap-1.5">
              <span
                aria-live="polite"
                className="text-xl font-semibold text-foreground tabular-nums"
              >
                {value}
              </span>
              {extra ? (
                <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                  {extra}
                </span>
              ) : null}
            </span>
            {hint ? (
              <span className="text-xs text-muted-foreground">{hint}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
