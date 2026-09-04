import { ChartArea } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

type BattleStatsTableHeaderProps = {
  title?: string;
  actions?: ReactNode;
  compact?: boolean;
  leading?: ReactNode;
};

export const BattleStatsTableHeader = ({
  title,
  actions,
  compact,
  leading,
}: BattleStatsTableHeaderProps) => {
  return (
    <div className="w-full shrink-0 border-b bg-background">
      <div
        className={cn(
          compact ? "flex min-h-[49px] items-center px-3 py-2" : "p-4",
        )}
      >
        <div
          className={cn(
            "flex w-full items-center",
            compact ? "gap-2" : "flex-wrap gap-4",
          )}
        >
          {leading ? (
            <div className="min-w-0 flex-1">{leading}</div>
          ) : (
            title && (
              <div
                className={cn(
                  "flex min-w-0 items-center font-semibold",
                  compact ? "gap-1.5 text-sm" : "gap-2",
                )}
              >
                <ChartArea
                  className={cn(
                    "text-primary",
                    compact ? "h-4 w-4" : "h-5 w-5",
                  )}
                />
                <span className="truncate">{title}</span>
              </div>
            )
          )}
          {actions ? (
            <div
              className={cn(
                "ml-auto flex shrink-0 items-center",
                compact
                  ? "gap-1.5 [&_button]:size-8 [&_button]:min-w-8 [&_button]:px-0 [&_svg]:h-4 [&_svg]:w-4"
                  : "flex-wrap gap-2",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
