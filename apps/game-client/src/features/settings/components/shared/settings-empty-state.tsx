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
      "ll:m-0 ll:rounded-sm ll:border ll:border-dashed ll:border-border ll:px-3 ll:py-3.5 ll:text-center ll:text-xs ll:leading-4 ll:text-muted-foreground ll:text-balance",
      className,
    )}
  >
    {children}
  </p>
);
