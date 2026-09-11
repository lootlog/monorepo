import { cn } from "cn";
import type { CSSProperties, FC, ReactNode } from "react";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import { useSettingsControlHighlight } from "./use-settings-control-highlight";

type SettingsRowProps = {
  /** Manifest id; enables search highlighting and "recently changed". */
  controlId?: SettingsControlId;
  /** DOM id of the row's control; makes the label click activate it. */
  htmlFor?: string;
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
  htmlFor,
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
        "ll:flex ll:min-h-6 ll:rounded-sm ll:px-2 ll:py-1.5 ll:transition-[background-color,box-shadow] ll:hover:bg-white/5 ll:data-[settings-highlighted]:bg-primary/15 ll:data-[settings-highlighted]:shadow-[inset_0_0_0_1px_var(--color-primary)]",
        layout === "inline"
          ? "ll:items-center ll:justify-between ll:gap-4"
          : "ll:flex-col ll:items-stretch ll:gap-1.5",
        disabled && "ll:opacity-60",
        className,
      )}
    >
      <div className="ll:min-w-0 ll:flex-1">
        {htmlFor ? (
          <label
            htmlFor={htmlFor}
            className={cn(
              "ll-custom-cursor-pointer ll:flex ll:items-center ll:text-xs ll:leading-4 ll:text-gray-100",
              labelClassName,
            )}
            style={labelStyle}
          >
            {label}
          </label>
        ) : (
          <div
            className={cn(
              "ll:flex ll:items-center ll:text-xs ll:leading-4 ll:text-gray-100",
              labelClassName,
            )}
            style={labelStyle}
          >
            {label}
          </div>
        )}
        {description ? (
          // The description is a click target for the control only; it must
          // not join the control's accessible name the way a second <label> would.
          // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
          <p
            className={cn(
              "ll:m-0 ll:mt-0.5 ll:text-[11px] ll:leading-[14px] ll:text-muted-foreground",
              htmlFor && "ll-custom-cursor-pointer",
            )}
            onClick={
              htmlFor
                ? () => document.getElementById(htmlFor)?.click()
                : undefined
            }
          >
            {description}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          "ll:flex ll:shrink-0 ll:items-center",
          layout === "stacked" && "ll:pt-0.5",
          controlClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
