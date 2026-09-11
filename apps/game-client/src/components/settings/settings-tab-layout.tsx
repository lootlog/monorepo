import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsTabLayoutProps = {
  children: ReactNode;
  /** Tab-level actions, rendered as a trailing toolbar above the sections. */
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * Subsection body: its sections, optionally preceded by a toolbar. The
 * navigation already names the subsection, so the body carries no heading.
 */
export const SettingsTabLayout: FC<SettingsTabLayoutProps> = ({
  children,
  actions,
  className,
  contentClassName,
}) => (
  <div className={cn("ll:flex ll:w-full ll:flex-col ll:gap-2", className)}>
    {actions ? (
      <div className="ll:flex ll:items-center ll:justify-end ll:gap-2 ll:px-2">
        {actions}
      </div>
    ) : null}
    <div className={cn("ll:flex ll:flex-col ll:gap-4", contentClassName)}>
      {children}
    </div>
  </div>
);
