import * as React from "react";

import { cn } from "cn";

export const inputVariantClasses = {
  default: "ll:rounded-sm ll:border ll:border-solid ll:border-gray-400",
  borderless: "ll:rounded-none ll:border-0 ll:shadow-none",
};

export type InputVariant = keyof typeof inputVariantClasses;

type InputProps = React.ComponentProps<"input"> & { variant?: InputVariant };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        onMouseDown={(evt) => {
          evt.stopPropagation();
        }}
        className={cn(
          "ll:placeholder:text-muted-foreground ll:[&::selection]:bg-primary ll:[&::selection]:text-primary-foreground ll:flex ll:h-6 ll:w-full ll:min-w-0 ll:bg-transparent ll:px-1 ll:py-1 ll:transition-[color,box-shadow] ll:outline-none ll:disabled:pointer-events-none ll:disabled:cursor-not-allowed ll:disabled:opacity-50",
          inputVariantClasses[variant],
          variant === "default" &&
            "ll:focus-visible:border-ring ll:focus-visible:ring-ring/50 ll:focus-visible:ring-[3px]",
          "ll:text-white ll:box-border ll:text-xs",
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
