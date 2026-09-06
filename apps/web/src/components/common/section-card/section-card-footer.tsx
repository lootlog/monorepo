import type { ComponentProps } from "react";
import { cn } from "cn";

export const SectionCardFooter = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    className={cn(
      "flex min-w-0 flex-wrap items-center gap-1 border-t border-border/70 bg-muted/20 p-1.5",
      className,
    )}
    {...props}
  />
);
