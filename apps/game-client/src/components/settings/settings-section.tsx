import { cn } from "@/lib/utils";
import type { FC, ReactNode } from "react";

type SettingsSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export const SettingsSection: FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  actions,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
}) => {
  const hasHeader = title || description || actions;

  return (
    <section className={cn("ll:flex ll:flex-col ll:gap-2.5", className)}>
      {hasHeader ? (
        <div className="ll:flex ll:items-start ll:justify-between ll:gap-3">
          <div className="ll:min-w-0 ll:flex-1 ll:space-y-1">
            {title ? (
              <h3
                className={cn(
                  "ll:text-xs ll:font-medium ll:uppercase ll:text-gray-400",
                  titleClassName,
                )}
              >
                {title}
              </h3>
            ) : null}
            {description ? (
              <p
                className={cn(
                  "ll:m-0 ll:text-[11px] ll:leading-4 ll:text-gray-400",
                  descriptionClassName,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="ll:shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("ll:flex ll:flex-col ll:gap-2", contentClassName)}>
        {children}
      </div>
    </section>
  );
};
