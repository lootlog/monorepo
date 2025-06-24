import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      onMouseDown={(evt) => {
        evt.stopPropagation();
      }}
      className={cn(
        "file:ll-text-foreground placeholder:ll-text-muted-foreground selection:ll-bg-primary selection:ll-text-primary-foreground dark:ll-bg-input/30 ll-border-gray-400 ll-flex ll-h-6 ll-w-full ll-min-w-0 ll-rounded-md ll-border ll-bg-transparent ll-px-1 ll-py-1 ll-shadow-xs ll-transition-[color,box-shadow] ll-outline-none file:ll-inline-flex file:ll-h-7 file:ll-border-0 file:ll-bg-transparent file:ll-text-sm file:ll-font-medium disabled:ll-pointer-events-none disabled:ll-cursor-not-allowed disabled:ll-opacity-50",
        "focus-visible:ll-border-ring focus-visible:ll-ring-ring/50 focus-visible:ll-ring-[3px]",
        "aria-invalid:ll-ring-destructive/20 dark:ll-aria-invalid:ll-ring-destructive/40 aria-invalid:ll-border-destructive",
        "ll-text-white ll-box-border ll-text-xs",
        className
      )}
      {...props}
    />
  );
}

export { Input };
