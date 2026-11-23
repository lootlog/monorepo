import type { ComponentProps } from "react";
import { cn } from "cn";

export const UnreadDot = ({ className, ...props }: ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn(
      "ll:pointer-events-none ll:size-2 ll:shrink-0 ll:rounded-full ll:bg-unread",
      className,
    )}
    {...props}
  />
);
