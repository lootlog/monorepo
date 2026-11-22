import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsListProps = {
  children: ReactNode;
  className?: string;
};

export const SettingsList: FC<SettingsListProps> = ({
  children,
  className,
}) => (
  <div className={cn("ll-settings-list ll:flex ll:flex-col", className)}>
    {children}
  </div>
);
