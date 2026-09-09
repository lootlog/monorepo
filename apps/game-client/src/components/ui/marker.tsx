import type { ComponentProps } from "react";
import { cn } from "cn";

export function Marker({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="marker"
      className={cn(
        "ll:flex ll:w-full ll:items-center ll:gap-2 ll:py-1 ll:text-[10px] ll:font-medium ll:text-muted-foreground ll:before:h-px ll:before:min-w-0 ll:before:flex-1 ll:before:bg-border ll:after:h-px ll:after:min-w-0 ll:after:flex-1 ll:after:bg-border",
        className,
      )}
      {...props}
    />
  );
}
