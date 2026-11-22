import type { FC, ReactNode } from "react";
import { cn } from "cn";

type WindowFooterProps = {
  children: ReactNode;
  className?: string;
  rowClassName?: string;
};

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
