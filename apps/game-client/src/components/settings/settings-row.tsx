import { cn } from "cn";
import type { CSSProperties, FC, ReactNode } from "react";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import { useSettingsControlHighlight } from "./use-settings-control-highlight";

type SettingsRowProps = {
  /** Manifest id; enables search highlighting and "recently changed". */
  controlId?: SettingsControlId;
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  /** Stack the control under the label instead of on the right. */
  layout?: "inline" | "stacked";
  className?: string;
  labelClassName?: string;
  labelStyle?: CSSProperties;
  controlClassName?: string;
};

/**
 * One setting: label, optional description and its control. Search results
 * scroll to and highlight the row through the settings UI store.
 */
export const SettingsRow: FC<SettingsRowProps> = ({
  controlId,
  label,
  description,
  children,
  disabled = false,
  layout = "inline",
  className,
  labelClassName,
  labelStyle,
  controlClassName,
}) => {
  const { ref, dataAttributes } =
    useSettingsControlHighlight<HTMLDivElement>(controlId);

  return (
    <div
      ref={ref}
      {...dataAttributes}
      className={cn(
        "ll:flex ll:min-h-[var(--ll-settings-control-height)] ll:gap-[var(--ll-settings-space-md)] ll:rounded-sm ll:px-2 ll:py-[var(--ll-settings-space-sm)] ll:transition-[background-color,box-shadow] ll:hover:bg-white/5 ll:data-[settings-highlighted]:bg-primary/15 ll:data-[settings-highlighted]:shadow-[inset_0_0_0_1px_var(--color-primary)]",
        layout === "inline"
          ? "ll:items-center ll:justify-between"
          : "ll:flex-col ll:items-stretch",
        disabled && "ll:opacity-60",
        className,
      )}
    >
      <div className="ll:min-w-0 ll:flex-1">
        <div
          className={cn(
            "ll:flex ll:items-center ll:text-[length:var(--ll-settings-font-size)] ll:leading-[var(--ll-settings-line-height)] ll:text-gray-100",
            labelClassName,
          )}
          style={labelStyle}
        >
          {label}
        </div>
        {description ? (
          <p className="ll:m-0 ll:text-[length:var(--ll-settings-meta-font-size)] ll:leading-[var(--ll-settings-meta-line-height)] ll:text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          "ll:flex ll:shrink-0 ll:items-center",
          layout === "stacked" && "ll:pt-[var(--ll-settings-space-xs)]",
          controlClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
