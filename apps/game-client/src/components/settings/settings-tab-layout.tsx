import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsTabLayoutProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Subsection body: a compact heading line followed by its sections. */
export const SettingsTabLayout: FC<SettingsTabLayoutProps> = ({
  title,
  description,
  children,
  actions,
  className,
  contentClassName,
}) => (
  <div
    className={cn(
      "ll:flex ll:w-full ll:flex-col ll:gap-[var(--ll-settings-space-lg)]",
      className,
    )}
  >
    <div className="ll:flex ll:items-start ll:justify-between ll:gap-2 ll:px-2">
      <div className="ll:min-w-0 ll:flex-1">
        <h2 className="ll:m-0 ll:text-[length:var(--ll-settings-font-size)] ll:font-semibold ll:leading-[var(--ll-settings-line-height)] ll:text-gray-100">
          {title}
        </h2>
        {description ? (
          <p className="ll:m-0 ll:text-[length:var(--ll-settings-meta-font-size)] ll:leading-[var(--ll-settings-meta-line-height)] ll:text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="ll:shrink-0">{actions}</div> : null}
    </div>
    <div
      className={cn(
        "ll:flex ll:flex-col ll:gap-[var(--ll-settings-space-lg)]",
        contentClassName,
      )}
    >
      {children}
    </div>
  </div>
);
