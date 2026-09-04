import { SettingsPanel } from "@/components/settings/settings-panel";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsEmptyStateProps = {
  children: ReactNode;
  className?: string;
};

export const SettingsEmptyState: FC<SettingsEmptyStateProps> = ({
  children,
  className,
}) => {
  return (
    <SettingsPanel
      className={cn(
        "ll:border-gray-700/80 ll:bg-gray-900/30 ll:text-[12px] ll:leading-5 ll:text-gray-400",
        className,
      )}
    >
      {children}
    </SettingsPanel>
  );
};
