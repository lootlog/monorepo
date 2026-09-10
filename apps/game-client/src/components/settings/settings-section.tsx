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
        "ll:flex ll:flex-col ll:gap-[var(--ll-settings-space-sm)] ll:rounded-sm ll:transition-[background-color,box-shadow] ll:data-[settings-highlighted]:bg-primary/10 ll:data-[settings-highlighted]:shadow-[inset_0_0_0_1px_var(--color-primary)]",
        className,
      )}
    >
      {hasHeader ? (
        <div className="ll:flex ll:items-end ll:justify-between ll:gap-2 ll:border-0 ll:border-b ll:border-gray-400/30 ll:px-2 ll:pb-1">
          <div className="ll:min-w-0 ll:flex-1">
            {title ? (
              <h3 className="ll:m-0 ll:text-[length:var(--ll-settings-label-font-size)] ll:font-semibold ll:uppercase ll:tracking-wide ll:text-muted-foreground">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="ll:m-0 ll:text-[length:var(--ll-settings-meta-font-size)] ll:leading-[var(--ll-settings-meta-line-height)] ll:text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="ll:shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("ll:flex ll:flex-col", contentClassName)}>
        {children}
      </div>
    </section>
  );
};
