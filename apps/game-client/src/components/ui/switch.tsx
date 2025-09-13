import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "ll:peer ll:inline-flex ll:h-3 ll:w-9 ll:shrink-0 ll:cursor-pointer ll:items-center ll:rounded-full ll:border-2 ll:border-transparent ll:shadow-sm ll:transition-colors ll:focus-visible:outline-none ll:focus-visible:ring-2 ll:focus-visible:ring-ring ll:disabled:cursor-not-allowed ll:disabled:opacity-50 ll:data-[state=checked]:bg-primary ll:data-[state=unchecked]:bg-primary/40",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "ll:pointer-events-none ll:block ll:h-4 ll:w-4 ll:rounded-full ll:bg-primary ll:shadow-lg ll:ring-0 ll:transition-transform ll:data-[state=checked]:translate-x-3 ll:data-[state=checked]:bg-accent-foreground ll:data-[state=unchecked]:-translate-x-2"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
