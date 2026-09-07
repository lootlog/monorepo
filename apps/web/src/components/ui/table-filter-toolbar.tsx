import type { ComponentProps } from "react";
import { cn } from "cn";

export function TableFilterToolbar({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2 border-b border-border/70 bg-background/30 p-2",
        className,
      )}
      {...props}
    />
  );
}
