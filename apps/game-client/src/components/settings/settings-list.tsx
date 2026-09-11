import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsListProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Container for entity rows (servers, muted players, hidden timers). A
 * hairline between rows marks where the next entry starts.
 */
export const SettingsList: FC<SettingsListProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "ll:flex ll:flex-col ll:[&>*+*]:border-t ll:[&>*+*]:border-solid ll:[&>*+*]:border-border ll:[&>*]:rounded-none ll:[&>*:first-child]:rounded-t-sm ll:[&>*:last-child]:rounded-b-sm",
      className,
    )}
  >
    {children}
  </div>
);
