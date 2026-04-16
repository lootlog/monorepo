import { cn } from "@/lib/utils";
import type { FC, ReactNode } from "react";

type SettingsTabLayoutProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export const SettingsTabLayout: FC<SettingsTabLayoutProps> = ({
  title,
  description,
  children,
  actions,
  className,
  contentClassName,
}) => {
  return (
    <div
      className={cn(
        "ll:flex ll:w-full ll:flex-col ll:gap-4 ll:pt-1",
        className,
      )}
    >
      <div className="ll:flex ll:items-start ll:justify-between ll:gap-3">
        <div className="ll:min-w-0 ll:flex-1 ll:space-y-1">
          <h2 className="ll:text-sm ll:font-semibold ll:text-white">{title}</h2>
          {description ? (
            <p className="ll:m-0 ll:text-[12px] ll:leading-5 ll:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="ll:shrink-0">{actions}</div> : null}
      </div>
      <div className={cn("ll:flex ll:flex-col ll:gap-4", contentClassName)}>
        {children}
      </div>
    </div>
  );
};
