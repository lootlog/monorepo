import { ChartArea } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { cn } from "cn";

type BattleStatsTableHeaderProps = {
  title?: string;
  actions?: ReactNode;
  compact?: boolean;
  leading?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export const BattleStatsTableHeader = ({
  title,
  actions,
  compact,
  leading,
  className,
  ref,
}: BattleStatsTableHeaderProps) => (
  <div ref={ref} className={cn("min-w-0 shrink-0", className)}>
    <SectionCardHeader
      title={title}
      icon={ChartArea}
      actions={
        actions && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              compact &&
                "[&_button]:size-8 [&_button]:min-w-8 [&_button]:px-0 [&_svg]:size-4",
            )}
          >
            {actions}
          </div>
        )
      }
    />
    {leading && (
      <div className="min-w-0 border-b border-border/70 px-3 py-2">
        {leading}
      </div>
    )}
  </div>
);
