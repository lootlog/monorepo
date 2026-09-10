import { cn } from "cn";
import {
  forwardRef,
  type ComponentProps,
  type ForwardedRef,
  type MouseEvent,
} from "react";

type ButtonVariant = "default" | "ghost" | "destructive" | "menu";

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
};

const BUTTON_VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
  default: "ll:border-border ll:bg-secondary ll:text-white ll:hover:bg-accent",
  ghost: "ll:border-border ll:bg-transparent ll:text-white ll:hover:bg-white/8",
  menu: "ll:text-[11px] ll:font-semibold ll:border-0 ll:h-auto ll:min-h-6 ll:px-2 ll:py-1.5 ll:bg-transparent ll:text-popover-foreground ll:hover:bg-muted ll:focus-visible:bg-muted ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:disabled:bg-transparent ll:disabled:text-muted-foreground ll:disabled:opacity-50",
  destructive:
    "ll:border-red-500/60 ll:bg-transparent ll:text-red-400 ll:hover:bg-red-500/10 ll:hover:text-red-300",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, children, variant = "default", onMouseDown, ...props },
    ref: ForwardedRef<HTMLButtonElement>,
  ) {
    const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onMouseDown?.(event);
    };

    return (
      <button
        ref={ref}
        data-variant={variant}
        className={cn(
          "ll:text-[12px] ll:border ll:rounded-sm ll:h-5 ll:disabled:bg-muted ll:disabled:text-muted-foreground ll:disabled:cursor-not-allowed ll:transition-colors ll:flex ll:items-center ll:justify-center",
          BUTTON_VARIANT_CLASS_NAMES[variant],
          className,
          "ll-custom-cursor-pointer",
        )}
        onMouseDown={handleMouseDown}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
