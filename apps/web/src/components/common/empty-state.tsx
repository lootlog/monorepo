import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { cn } from "cn";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  /** Replaces the icon tile, for example with a themed illustration. */
  media?: ReactNode;
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  framed?: boolean;
  /** Sized for a state inside a card rather than a whole page or table. */
  compact?: boolean;
  action?: ReactNode;
};

export const EmptyState = ({
  icon: Icon,
  media,
  title,
  description,
  className,
  framed = false,
  compact = false,
  action,
}: EmptyStateProps) => {
  const content = (
    <Empty
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

  if (!framed) {
    return content;
  }

  return (
    <SectionCard className="border-border bg-card p-0">
      <SectionCardContent className="p-0">{content}</SectionCardContent>
    </SectionCard>
  );
};
