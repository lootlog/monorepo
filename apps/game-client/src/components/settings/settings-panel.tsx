import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsPanelProps = {
  children: ReactNode;
  className?: string;
};

export const SettingsPanel: FC<SettingsPanelProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "ll:rounded-md ll:border ll:border-gray-600 ll:bg-gray-900/70 ll:px-3 ll:py-2",
        className,
      )}
    >
      {children}
    </div>
  );
};
