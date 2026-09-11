import { cn } from "cn";
import type { FC, ReactNode } from "react";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import { SettingsSectionHeader } from "./settings-section-header";
import { useSettingsControlHighlight } from "./use-settings-control-highlight";

type SettingsSectionProps = {
  /** Manifest id when the whole section is one searchable control. */
  controlId?: SettingsControlId;
  title?: ReactNode;
  /** Explains the whole group; rows under it stay label-only. */
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * A titled group of rows. Consecutive sections are divided by a hairline
 * drawn in the gap above them, so a highlight hugs only the section itself.
 */
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
        "ll:relative ll:flex ll:flex-col ll:rounded-sm ll:transition-[background-color,box-shadow] ll:data-[settings-highlighted]:bg-primary/10 ll:data-[settings-highlighted]:shadow-[inset_0_0_0_1px_var(--color-primary)]",
        "ll:[section+&]:before:pointer-events-none ll:[section+&]:before:absolute ll:[section+&]:before:inset-x-2 ll:[section+&]:before:-top-3 ll:[section+&]:before:h-px ll:[section+&]:before:bg-border ll:[section+&]:before:content-['']",
        description ? "ll:gap-2" : "ll:gap-1",
        className,
      )}
    >
      {hasHeader ? (
        <SettingsSectionHeader
          title={title}
          description={description}
          actions={actions}
        />
      ) : null}
      <div className={cn("ll:flex ll:flex-col ll:gap-0.5", contentClassName)}>
        {children}
      </div>
    </section>
  );
};
