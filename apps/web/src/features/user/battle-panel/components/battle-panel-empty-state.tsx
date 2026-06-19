import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
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
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="rounded-xl bg-muted/40 p-3 shadow-inner shadow-primary/5">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!framed) {
    return content;
  }

  return (
    <Card className="border-border bg-card/40 p-0 backdrop-blur-sm">
      {content}
    </Card>
  );
};
