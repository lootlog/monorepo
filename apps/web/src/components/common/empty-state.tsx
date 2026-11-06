import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { cn } from "cn";
import { useState, type ReactNode } from "react";
import { useFillRemainingHeight } from "@/hooks/utils/use-fill-remaining-height";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  /** Replaces the icon tile, for example with a themed illustration. */
  media?: ReactNode;
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  /**
   * The page's only content: fills the visible space below it, so the state
   * sits in the middle of what is left of the screen.
   */
  fill?: boolean;
  /** Sized for a state inside a card rather than a whole page or table. */
  compact?: boolean;
  action?: ReactNode;
};

/** The height of a page's empty state when little is left of the screen. */
const MIN_FILL_HEIGHT = 256;

export const EmptyState = ({
  icon: Icon,
  media,
  title,
  description,
  className,
  fill = false,
  compact = false,
  action,
}: EmptyStateProps) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  const fillHeight = useFillRemainingHeight(
    fill ? element : null,
    MIN_FILL_HEIGHT,
  );

  return (
    <Empty
      ref={setElement}
      style={fillHeight === undefined ? undefined : { minHeight: fillHeight }}
      className={cn(
        "border-0 bg-transparent",
        compact ? "min-h-0 gap-3 px-4 py-8 md:p-8" : "min-h-64 px-6 py-12",
        className,
      )}
    >
      <EmptyHeader>
        {media ??
          (Icon ? (
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
          ) : null)}
        <EmptyTitle className={cn(compact && "text-sm")}>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
};
