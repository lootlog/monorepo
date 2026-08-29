import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@lootlog/ui/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        white: "border-transparent bg-white text-black hover:bg-white/90",
        green:
          "border-transparent bg-green-500/80 text-white hover:bg-green-500",
        live: "border-signal-live/30 bg-signal-live/10 text-signal-live",
        ready: "border-signal-ready/30 bg-signal-ready/10 text-signal-ready",
        timer: "border-signal-timer/30 bg-signal-timer/10 text-signal-timer",
        alert: "border-signal-alert/30 bg-signal-alert/10 text-signal-alert",
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
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
