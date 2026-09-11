import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsTabLayoutProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Subsection body. The navigation already names the subsection, so it carries
 * no heading; the gap leaves room for the hairline each section draws above
 * itself.
 */
export const SettingsTabLayout: FC<SettingsTabLayoutProps> = ({
  children,
  className,
}) => (
  <div className={cn("ll:flex ll:w-full ll:flex-col ll:gap-6", className)}>
    {children}
  </div>
);
