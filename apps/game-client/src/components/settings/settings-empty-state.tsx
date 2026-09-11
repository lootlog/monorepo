import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsEmptyStateProps = {
  children: ReactNode;
  className?: string;
};

export const SettingsEmptyState: FC<SettingsEmptyStateProps> = ({
  children,
  className,
}) => (
  <p
    className={cn(
      "ll:m-0 ll:rounded-sm ll:bg-black/25 ll:px-2 ll:py-1.5 ll:text-[11px] ll:leading-[14px] ll:text-muted-foreground",
      className,
    )}
  >
    {children}
  </p>
);
