import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export const Label = ({
  className,
  children,
  ...props
}: ComponentProps<"label">) => {
  return (
    <label
      htmlFor="text"
      className={cn("ll:text-xs ll:font-semibold", className)}
      {...props}
    >
      {children}
    </label>
  );
};
