import type { ComponentProps } from "react";
import { cn } from "cn";

export const SectionCardContent = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div className={cn("min-w-0 p-3", className)} {...props} />
);
