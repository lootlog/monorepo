import { ListGroupHeading } from "@/components/common/list-group-heading";
import {
  LIST_BAND_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { ReactNode, Ref } from "react";
import { cn } from "cn";

type BattleStatsTableHeaderProps = {
  id: string;
  title: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export const BattleStatsTableHeader = ({
  id,
  title,
  actions,
  toolbar,
  className,
  ref,
}: BattleStatsTableHeaderProps) => (
  <div ref={ref} className={cn("min-w-0", className)}>
    <ListGroupHeading
      id={id}
      className={LIST_BAND_HEADING_CLASS}
      trailing={
        actions && <div className="flex items-center gap-1">{actions}</div>
      }
    >
      {title}
    </ListGroupHeading>
    {toolbar && (
      <div
        data-list-tile
        className={cn(
          "flex min-h-12 items-center bg-background py-2 transition-colors has-[input:focus-visible]:border-primary motion-reduce:transition-none",
          LIST_TILE_RULE_CLASS,
          LIST_TILE_INSET_CLASS,
        )}
      >
        {toolbar}
      </div>
    )}
  </div>
);
