import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  indicatorColor?: string;
}

function Progress({
  className,
  value,
  indicatorColor,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "ll-bg-gray-500/20 ll-relative ll-h-1 ll-w-full ll-overflow-hidden",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="ll-bg-[#5ecbff] ll-h-full ll-w-full ll-flex-1 ll-transition-all"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          background: indicatorColor,
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
