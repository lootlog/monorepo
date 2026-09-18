import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FC, ReactNode } from "react";

export type BattleStatsExpandButtonProps = {
  children: ReactNode;
  className?: string;
  /** Dense numeric cells mark the expandable value with an underline instead of a chevron. */
  dense?: boolean;
  expanded: boolean;
  onToggle: () => void;
};

export const BattleStatsExpandButton: FC<BattleStatsExpandButtonProps> = ({
  children,
  className,
  dense = false,
  expanded,
  onToggle,
}) => {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <Button
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "h-7 gap-1 rounded-sm bg-transparent px-1 text-[13px] tabular-nums",
        dense &&
          "underline decoration-muted-foreground/60 decoration-dotted underline-offset-4",
        expanded && "bg-secondary",
        className,
      )}
      variant="secondary"
      size="sm"
    >
      {children}
      {!dense && (
        <Chevron
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </Button>
  );
};
