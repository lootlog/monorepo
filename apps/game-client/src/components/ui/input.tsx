import * as React from "react";

import { cn } from "cn";

export const inputVariantClasses = {
  default: "ll:rounded-sm ll:border ll:border-border",
  /** Search and toolbar fields: the input border on a translucent surface. */
  filled: "ll:rounded-sm ll:border ll:border-input ll:dark:bg-input/30",
  borderless: "ll:rounded-none ll:border-0 ll:shadow-none",
};

export const inputSizeClasses = {
  sm: "ll:h-6 ll:px-1",
  md: "ll:h-7 ll:px-2",
};

export type InputVariant = keyof typeof inputVariantClasses;

export type InputSize = keyof typeof inputSizeClasses;

type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  variant?: InputVariant;
  size?: InputSize;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", size = "sm", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        data-size={size}
        onMouseDown={(evt) => {
          evt.stopPropagation();
        }}
        className={cn(
          "ll:placeholder:text-muted-foreground ll:selection:bg-primary ll:selection:text-primary-foreground ll:flex ll:w-full ll:min-w-0 ll:bg-transparent ll:py-1 ll:transition-[color,box-shadow] ll:outline-none ll:disabled:pointer-events-none ll:disabled:cursor-not-allowed ll:disabled:opacity-50",
          inputSizeClasses[size],
          inputVariantClasses[variant],
          variant !== "borderless" &&
            "ll:focus-visible:border-ring ll:focus-visible:ring-ring/50 ll:focus-visible:ring-[3px]",
          "ll:text-white ll:text-xs",
          {
            "ll:!cursor-not-allowed": props.disabled,
          },
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
