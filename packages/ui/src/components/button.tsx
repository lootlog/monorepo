import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { Spinner } from "@lootlog/ui/components/spinner";

import { cn } from "cn";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[background-color,color,border-color,transform] outline-none disabled:pointer-events-none disabled:opacity-45 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-input bg-background text-foreground hover:border-primary/60 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  loading,
  icon,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    icon?: ReactNode;
  }) {
  const hasIndicator = loading !== undefined || icon !== undefined;
  const indicator = (
    <span
      aria-hidden="true"
      className="relative inline-grid size-4 shrink-0 place-items-center"
    >
      <span className={cn("inline-flex", loading && "opacity-0")}>{icon}</span>
      {loading && (
        <Spinner className="absolute size-4 motion-reduce:animate-none" />
      )}
    </span>
  );

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {size === "icon" && hasIndicator ? (
        <span className="relative inline-grid place-items-center">
          <span className={cn("inline-flex", loading && "opacity-0")}>
            {children ?? icon}
          </span>
          {loading && (
            <span aria-hidden="true" className="absolute inline-flex">
              <Spinner className="size-4 motion-reduce:animate-none" />
            </span>
          )}
        </span>
      ) : (
        <>
          {hasIndicator && indicator}
          {children}
        </>
      )}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
