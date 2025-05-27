import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ll-inline-flex ll-items-center ll-justify-center ll-whitespace-nowrap ll-rounded-md ll-text-sm ll-font-medium ll-transition-colors focus-visible:ll-outline-none focus-visible:ll-ring-1 focus-visible:ll-ring-ring disabled:ll-pointer-events-none disabled:ll-opacity-50",
  {
    variants: {
      variant: {
        default:
          "ll-bg-primary ll-text-primary-foreground ll-shadow hover:ll-bg-primary/90",
        destructive:
          "ll-bg-destructive ll-text-destructive-foreground ll-shadow-sm hover:ll-bg-destructive/90",
        outline:
          "ll-border ll-border-input ll-bg-background ll-shadow-sm hover:ll-bg-accent hover:ll-text-accent-foreground",
        secondary:
          "ll-bg-secondary ll-text-secondary-foreground ll-shadow-sm hover:ll-bg-secondary/80",
        ghost: "hover:ll-bg-accent hover:ll-text-accent-foreground",
        link: "ll-text-primary ll-underline-offset-4 hover:ll-underline",
      },
      size: {
        default: "ll-h-9 ll-px-4 ll-py-2",
        sm: "ll-h-8 ll-rounded-md ll-px-3 ll-text-xs",
        lg: "ll-h-10 ll-rounded-md ll-px-8",
        icon: "ll-h-9 ll-w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      onClick?.(e);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        onMouseDown={(e) => e.stopPropagation()}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
