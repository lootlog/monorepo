import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsPanelProps = {
  children: ReactNode;
  className?: string;
};

/** Translucent surface for list items and read-only blocks inside settings. */
export const SettingsPanel: FC<SettingsPanelProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "ll:rounded-sm ll:bg-black/20 ll:px-2 ll:py-[var(--ll-settings-space-sm)]",
      className,
    )}
  >
    {children}
  </div>
);
