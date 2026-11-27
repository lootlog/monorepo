import type { ReactNode } from "react";
import { cn } from "cn";

const SPARK_POSITIONS = ["top-right", "bottom-left", "top-left"] as const;

export const SparkleBurst = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span className={cn("sparkle-burst", className)}>
    {children}
    {SPARK_POSITIONS.map((position) => (
      <span
        key={position}
        aria-hidden="true"
        className={`sparkle-burst__spark sparkle-burst__spark--${position}`}
      />
    ))}
  </span>
);
