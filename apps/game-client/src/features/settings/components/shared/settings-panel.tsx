import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsPanelProps = {
  children: ReactNode;
  className?: string;
};

export const SettingsPanel: FC<SettingsPanelProps> = ({
  children,
  className,
}) => (
  <div
    className={cn("ll:rounded-sm ll:bg-black/25 ll:px-2 ll:py-1", className)}
  >
    {children}
  </div>
);
