import { cn } from "cn";
import type { FC, ReactNode } from "react";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import { useSettingsControlHighlight } from "./use-settings-control-highlight";

type SettingsSectionProps = {
  /** Manifest id when the whole section is one searchable control. */
  controlId?: SettingsControlId;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** A titled block of rows separated from its neighbours by a hairline. */
export const SettingsSection: FC<SettingsSectionProps> = ({
  controlId,
  title,
  description,
  children,
  actions,
  className,
  contentClassName,
}) => {
  const hasHeader = title || description || actions;

  const { ref, dataAttributes } =
    useSettingsControlHighlight<HTMLElement>(controlId);

  return (
    <section
      ref={ref}
      {...dataAttributes}
      className={cn(
        "ll:flex ll:flex-col ll:gap-1 ll:border-0 ll:border-gray-400/30 ll:transition-[background-color,box-shadow] ll:[&:not(:first-child)]:border-t ll:[&:not(:first-child)]:pt-4 ll:data-[settings-highlighted]:bg-primary/10 ll:data-[settings-highlighted]:shadow-[inset_0_0_0_1px_var(--color-primary)]",
        className,
      )}
    >
      {hasHeader ? (
        <div className="ll:flex ll:items-end ll:justify-between ll:gap-2 ll:px-2">
          <div className="ll:min-w-0 ll:flex-1">
            {title ? (
              <h3 className="ll:m-0 ll:text-xs ll:font-semibold ll:leading-4 ll:text-foreground">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="ll:m-0 ll:text-[11px] ll:leading-[14px] ll:text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="ll:shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("ll:flex ll:flex-col ll:gap-0.5", contentClassName)}>
        {children}
      </div>
    </section>
  );
};
