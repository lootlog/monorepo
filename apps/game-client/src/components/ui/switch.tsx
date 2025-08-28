import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "ll-peer ll-inline-flex ll-h-3 ll-w-9 ll-shrink-0 ll-cursor-pointer ll-items-center ll-rounded-full ll-border-2 ll-border-transparent ll-shadow-sm ll-transition-colors focus-visible:ll-outline-none focus-visible:ll-ring-2 focus-visible:ll-ring-ring focus-visible:ll-ring-offset-2 focus-visible:ll-ring-offset-background disabled:ll-cursor-not-allowed disabled:ll-opacity-50 data-[state=checked]:ll-bg-primary data-[state=unchecked]:ll-bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "ll-pointer-events-none ll-block ll-h-4 ll-w-4 ll-rounded-full ll-bg-primary ll-shadow-lg ll-ring-0 ll-transition-transform data-[state=checked]:ll-translate-x-3 data-[state=checked]:ll-bg-accent-foreground data-[state=unchecked]:-ll-translate-x-2"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
