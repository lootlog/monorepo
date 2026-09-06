import { ChartArea } from "lucide-react";
import type { ReactNode } from "react";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
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
}: BattleStatsTableHeaderProps) => (
  <div className="min-w-0 shrink-0">
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
