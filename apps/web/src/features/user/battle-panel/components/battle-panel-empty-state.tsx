import { Card, CardContent } from "@lootlog/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

type BattlePanelEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  framed?: boolean;
};

export const BattlePanelEmptyState = ({
  icon: Icon,
  title,
  description,
  className,
  framed = false,
}: BattlePanelEmptyStateProps) => {
  const content = (
    <Empty
      className={cn("min-h-64 border-0 bg-transparent px-6 py-12", className)}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  );

  if (!framed) {
    return content;
  }

  return (
    <Card className="border-border bg-card p-0">
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
};
