import type { FC, ReactNode } from "react";
import { cn } from "cn";

type AsyncStatusBarProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Stacks strip-layout status indicators under the toolbar strips so they read
 * as more strips, not as floating pills. Collapses when nothing is active.
 */
export const AsyncStatusBar: FC<AsyncStatusBarProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "ll:flex ll:w-full ll:shrink-0 ll:flex-col ll:empty:hidden",
      className,
    )}
  >
    {children}
  </div>
);
