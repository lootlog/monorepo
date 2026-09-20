import { cn } from "cn";
import type { FC, ReactNode } from "react";

export const LootMetaItem = ({
  icon: Icon,
  children,
  className,
  title,
  label,
}: {
  icon: FC<{ className?: string }>;
  children: ReactNode;
  className?: string;
  title?: string;
  label?: string;
}) => (
  <span
    className={cn(
      "flex items-center gap-1.5 whitespace-nowrap text-xs leading-tight tabular-nums text-muted-foreground",
      className,
    )}
    title={title}
  >
    <span aria-hidden className="flex shrink-0">
      <Icon className="size-3.5 shrink-0" />
    </span>
    {label && <span className="sr-only">{label} </span>}
    {children}
  </span>
);
