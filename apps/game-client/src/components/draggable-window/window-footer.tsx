import type { FC, ReactNode } from "react";
import { cn } from "cn";

type WindowFooterProps = {
  children: ReactNode;
  /** Extra classes for the outer bar, e.g. a bleed into the window padding. */
  className?: string;
  /** Extra classes for the 28px content row, e.g. spacing between children. */
  rowClassName?: string;
};

/** Bleeds the footer through the 4px window padding so it sits on the frame. */
export const windowFooterBleedClassName = "ll:-mx-1 ll:-mb-1 ll:w-auto";

/**
 * Bottom bar of a draggable window: one rule on top and a 28px content row,
 * the same size as a toolbar strip so stacked bars line up across windows.
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
    <div className={cn("ll:flex ll:h-7 ll:items-center", rowClassName)}>
      {children}
    </div>
  </div>
);
