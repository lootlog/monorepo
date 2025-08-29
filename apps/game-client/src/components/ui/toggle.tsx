import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "ll-inline-flex ll-outline-none ll-border-none ll-items-center ll-justify-center ll-gap-2 ll-rounded-md ll-text-sm ll-font-medium ll-transition-colors hover:ll-bg-muted hover:ll-text-muted-foreground focus-visible:ll-outline-none focus-visible:ll-ring-1 focus-visible:ll-ring-ring disabled:ll-pointer-events-none disabled:ll-opacity-50 data-[state=on]:ll-bg-accent data-[state=on]:ll-text-accent-foreground [&_svg]:ll-pointer-events-none [&_svg]:ll-size-4 [&_svg]:ll-shrink-0",
  {
    variants: {
      variant: {
        default:
          "ll-bg-muted hover:ll-text-accent-foreground/100 ll-text-accent-foreground/50",
        outline:
          "ll-bg-transparent ll-shadow-sm hover:ll-bg-accent hover:ll-text-accent-foreground",
      },
      size: {
        default: "ll-h-9 ll-px-2 ll-min-w-9",
        sm: "ll-h-8 ll-px-1.5 ll-min-w-8",
        lg: "ll-h-10 ll-px-2.5 ll-min-w-10",
        xs: "ll-h-6 ll-px-3 ll-min-w-6 ll-text-xs ll-font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
