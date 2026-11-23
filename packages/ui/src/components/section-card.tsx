import type { ComponentProps } from "react";
import { Card } from "./card";
import { cn } from "cn";

export const SectionCard = ({
  className,
  ...props
}: ComponentProps<typeof Card>) => (
  <Card className={cn("min-w-0 gap-0 p-0", className)} {...props} />
);
