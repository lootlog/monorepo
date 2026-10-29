import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsListProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Container for entity rows (servers, muted players, hidden timers). A
 * hairline between rows marks where the next entry starts; SettingsListRow
 * draws it, so no rule here has a universal `> *` subject.
 */
export const SettingsList: FC<SettingsListProps> = ({
  children,
  className,
}) => (
  <div className={cn("ll-settings-list ll:flex ll:flex-col", className)}>
    {children}
  </div>
);
