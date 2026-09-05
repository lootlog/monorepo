import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { cn } from "cn";

export function SettingsHeader({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cn("gap-4 border-border bg-card p-4 shrink-0", className)}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {description}
          </p>
        </div>
      </div>
      {children}
    </Card>
  );
}
