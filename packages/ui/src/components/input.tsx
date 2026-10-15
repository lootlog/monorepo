import * as React from "react";

import { cn } from "cn";

const inputSizes = {
  sm: "h-8",
  default: "h-9",
  lg: "h-10",
};

function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  size?: keyof typeof inputSizes;
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        inputSizes[size],
        "flex w-full min-w-0 rounded-control border border-input bg-background px-3 py-1.5 text-base text-foreground outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground hover:border-primary hover:bg-foreground/[0.04] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-inset aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
