import { cn } from "cn";
import type { ComponentProps } from "react";
import { SectionCard } from "./section-card";

type StatsTileGridProps = ComponentProps<"div"> & {
  framed?: boolean;
};

export const StatsTileGrid = ({
  framed = false,
  className,
  children,
  ...props
}: StatsTileGridProps) => {
  const grid = (
    <div
      className={cn("-mr-px grid grid-cols-1", framed && "-mb-px", className)}
    >
      {children}
    </div>
  );

  return framed ? (
    <SectionCard {...props}>{grid}</SectionCard>
  ) : (
    <div {...props} className="overflow-hidden">
      {grid}
    </div>
  );
};
