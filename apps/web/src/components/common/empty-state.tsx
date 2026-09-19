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
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  framed?: boolean;
  action?: ReactNode;
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  className,
  framed = false,
  action,
}: EmptyStateProps) => {
  const content = (
    <Empty
      className={cn("min-h-64 border-0 bg-transparent px-6 py-12", className)}
    >
      <EmptyHeader className="animate-content-in">
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
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
