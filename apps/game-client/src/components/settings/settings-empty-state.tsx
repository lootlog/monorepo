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
      "ll:m-0 ll:rounded-sm ll:bg-black/20 ll:px-2 ll:py-[var(--ll-settings-space-md)] ll:text-[length:var(--ll-settings-meta-font-size)] ll:leading-[var(--ll-settings-meta-line-height)] ll:text-muted-foreground",
      className,
    )}
  >
    {children}
  </p>
);
