import { cn } from "cn";
import type { ReactNode } from "react";

type StatsSectionColumnsProps = {
  /** Column counts and spans past `xl`, such as `xl:grid-cols-2`. */
  className?: string;
  children: ReactNode;
};

/**
 * Banded sections side by side from `xl`, one hairline between them; narrower
 * pages stack them.
 */
export const StatsSectionColumns = ({
  className,
  children,
}: StatsSectionColumnsProps) => (
  <div
    className={cn(
      "grid min-w-0 grid-cols-1 *:min-w-0 xl:*:border-sidebar-border xl:[&>*+*]:border-l",
      className,
    )}
  >
    {children}
  </div>
);
