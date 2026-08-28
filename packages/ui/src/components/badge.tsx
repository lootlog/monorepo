import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@lootlog/ui/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-active",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-active",
        outline: "text-foreground",
        white:
          "border-transparent bg-primary-foreground text-primary hover:bg-primary-foreground",
        green:
          "border-transparent bg-signal-ready text-background hover:bg-signal-ready",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      data-slot="badge"
      data-variant={variant ?? "default"}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
