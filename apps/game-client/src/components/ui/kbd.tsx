import { cn } from "cn";
import type { ComponentProps } from "react";

function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "ll:pointer-events-none ll:inline-flex ll:h-5 ll:w-fit ll:min-w-5 ll:select-none ll:items-center ll:justify-center ll:gap-1 ll:rounded-sm ll:bg-muted ll:px-1 ll:font-sans ll:text-[11px] ll:font-medium ll:text-muted-foreground",
        "ll:[&_svg:not([class*=size-])]:size-3",
        "ll:[[data-slot=tooltip-content]_&]:bg-background/20 ll:[[data-slot=tooltip-content]_&]:text-background ll:dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("ll:inline-flex ll:items-center ll:gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
