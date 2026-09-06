import { cn } from "cn";
import type { FC, ReactNode } from "react";
export const LootMetaItem = ({
  icon: Icon,
  children,
  className,
  title,
}: {
  icon: FC<{ className?: string }>;
  children: ReactNode;
  className?: string;
  title?: string;
}) => (
  <span
    className={cn(
      "flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground",
      className,
    )}
    title={title}
  >
    <Icon className="h-3 w-3 shrink-0" />
    {children}
  </span>
);
