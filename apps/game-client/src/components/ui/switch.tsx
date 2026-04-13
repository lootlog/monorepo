import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@lootlog/ui/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "ll:peer ll:inline-flex ll:h-4 ll:w-9 ll:shrink-0 ll-custom-cursor-pointer ll:items-center ll:rounded-sm ll:border ll:border-gray-400 ll:shadow-sm ll:transition-colors ll:focus-visible:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-ring ll:disabled:cursor-not-allowed ll:disabled:opacity-50 ll:data-[state=checked]:bg-purple-500/80 ll:data-[state=checked]:border-purple-400 ll:data-[state=unchecked]:bg-gray-700 ll:px-0.5",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "ll:pointer-events-none ll:block ll:h-2.5 ll:w-3.5 ll:rounded-sm ll:bg-white ll:shadow-md ll:ring-0 ll:transition-transform ll:data-[state=checked]:translate-x-4 ll:data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
