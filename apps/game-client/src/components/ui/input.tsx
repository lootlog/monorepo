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
        "placeholder:ll-text-muted-foreground selection:ll-bg-primary selection:ll-text-primary-foreground ll-border-gray-400 ll-flex ll-h-6 ll-w-full ll-min-w-0 ll-rounded-sm ll-border ll-border-solid ll-bg-transparent ll-px-1 ll-py-1 ll-transition-[color,box-shadow] ll-outline-none disabled:ll-pointer-events-none disabled:ll-cursor-not-allowed disabled:ll-opacity-50",
        "focus-visible:ll-border-ring focus-visible:ll-ring-ring/50 focus-visible:ll-ring-[3px]",
        "ll-text-white ll-box-border ll-text-xs",
        {
          "!ll-cursor-not-allowed": props.disabled,
        },
        className
      )}
      {...props}
    />
  );
}

export { Input };
