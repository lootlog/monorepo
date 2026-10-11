import { ChartArea } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { cn } from "cn";

type BattleStatsTableHeaderProps = {
  title?: string;
  actions?: ReactNode;
  leading?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export const BattleStatsTableHeader = ({
  title,
  actions,
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
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
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
