import * as React from "react";

import { cn } from "@lootlog/ui/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      onMouseDown={(evt) => {
        evt.stopPropagation();
      }}
      className={cn(
        "ll:placeholder:text-muted-foreground ll:selection:bg-primary ll:selection:text-primary-foreground ll:border-gray-400 ll:flex ll:h-6 ll:w-full ll:min-w-0 ll:rounded-sm ll:border ll:border-solid ll:bg-transparent ll:px-1 ll:py-1 ll:transition-[color,box-shadow] ll:outline-none ll:disabled:pointer-events-none ll:disabled:cursor-not-allowed ll:disabled:opacity-50",
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
}

export { Input };
