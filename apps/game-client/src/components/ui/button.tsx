import { cn } from "cn";
import {
  forwardRef,
  type ComponentProps,
  type ForwardedRef,
  type MouseEvent,
} from "react";

type ButtonVariant = "default" | "ghost" | "destructive";
type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
};

const BUTTON_VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
  default:
    "ll:border-gray-400 ll:bg-gray-400/30 ll:text-white ll:hover:bg-gray-400/50",
  ghost:
    "ll:border-gray-400/50 ll:bg-transparent ll:text-white ll:hover:bg-white/8",
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
        className={cn(
          "ll:text-[12px] ll:border ll:rounded-sm ll:h-5 ll:disabled:bg-gray-700/30 ll:disabled:text-gray-500 ll:disabled:cursor-not-allowed ll:transition-colors ll:flex ll:items-center ll:justify-center",
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
