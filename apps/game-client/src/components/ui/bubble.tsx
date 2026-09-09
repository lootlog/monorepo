import type { ComponentProps } from "react";
import { cn } from "cn";

export function Bubble({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble"
      className={cn(
        "ll:min-w-0 ll:max-w-full ll:select-text ll:whitespace-pre-wrap ll:[overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}
