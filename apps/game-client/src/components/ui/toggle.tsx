import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@lootlog/ui/lib/utils";

const toggleVariants = cva(
  "ll:inline-flex ll:outline-none ll:border-none ll:items-center ll:justify-center ll:gap-2 ll:rounded-md ll:text-sm ll:font-medium ll:transition-colors ll:hover:bg-muted ll:hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-white [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "ll:bg-muted ll:data-[state=on]:bg-primary ll:data-[state=on]:text-accent-foreground/100 ll:hover:text-accent-foreground/100 ll:text-accent-foreground/50",
        outline:
          "ll:bg-transparent ll:shadow-sm ll:hover:bg-accent ll:hover:text-accent-foreground",
      },
      size: {
        default: "ll:h-9 ll:px-2 ll:min-w-9",
        sm: "ll:h-8 ll:px-1.5 ll:min-w-8",
        lg: "ll:h-10 ll:px-2.5 ll:min-w-10",
        xs: "ll:h-6 ll:px-3 ll:min-w-6 ll:text-xs ll:font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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

export { toggleVariants };
