import { cn } from "cn";
import type { FC, ReactNode } from "react";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import { SettingsSectionHeader } from "./settings-section-header";
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

/** A titled card of rows; lists inside it sit on a darker, recessed surface. */
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
        "ll:flex ll:flex-col ll:gap-1.5 ll:rounded-sm ll:border ll:border-white/8 ll:bg-white/4 ll:p-2 ll:transition-[background-color,box-shadow] ll:data-[settings-highlighted]:bg-primary/10 ll:data-[settings-highlighted]:shadow-[inset_0_0_0_1px_var(--color-primary)]",
        className,
      )}
    >
      {hasHeader ? (
        <SettingsSectionHeader
          title={title}
          description={description}
          actions={actions}
          className="ll:pt-0.5"
        />
      ) : null}
      <div className={cn("ll:flex ll:flex-col ll:gap-0.5", contentClassName)}>
        {children}
      </div>
    </section>
  );
};
