import type { FC, ReactNode } from "react";
import { cn } from "cn";

type WindowFooterProps = {
  children: ReactNode;
  /** Extra classes for the outer bar, e.g. a bleed into the window padding. */
  className?: string;
  /** Extra classes for the 32px content row, e.g. spacing between children. */
  rowClassName?: string;
};

/**
 * Bottom bar of a draggable window: one rule on top and a 32px content row,
 * one step taller than a toolbar strip so the bottom edge reads as a footer.
 */
export const WindowFooter: FC<WindowFooterProps> = ({
  children,
  className,
  rowClassName,
}) => (
  <div
    className={cn(
      "ll:w-full ll:shrink-0 ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40",
      className,
    )}
  >
    <div className={cn("ll:flex ll:h-8 ll:items-center", rowClassName)}>
      {children}
    </div>
  </div>
);
