import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "ll-peer ll-h-4 ll-w-4 ll-shrink-0 ll-rounded-sm ll-border ll-border-primary ll-shadow focus-visible:ll-outline-none focus-visible:ll-ring-1 focus-visible:ll-ring-ring disabled:ll-cursor-not-allowed disabled:ll-opacity-50 data-[state=checked]:ll-bg-primary data-[state=checked]:ll-text-primary-foreground",
      className
    )}
    {...props}
  ></CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
