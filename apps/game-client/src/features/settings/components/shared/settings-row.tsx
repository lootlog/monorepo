import { cn } from "cn";
import type { CSSProperties, FC, ReactNode } from "react";
import {
  getControlSettingKeys,
  type SettingsControlId,
} from "@/features/settings/settings-manifest";
import { useSettingsKeysSaveMark } from "@/lib/settings-persistence/settings-save-status.store";
import { SettingsSaveBadge } from "./settings-save-badge";
import { useSettingsControlHighlight } from "./use-settings-control-highlight";

const SETTINGS_WIDE_CONTROL_CLASS_NAME = "ll:w-48 ll:max-w-full";

type SettingsRowProps = {
  controlId?: SettingsControlId;
  settingKeys?: readonly string[];
  htmlFor?: string;
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  layout?: "inline" | "stacked";
  control?: "auto" | "wide";
  className?: string;
  labelClassName?: string;
  labelStyle?: CSSProperties;
  controlClassName?: string;
};

export const SettingsRow: FC<SettingsRowProps> = ({
  controlId,
  settingKeys,
  htmlFor,
  label,
  description,
  children,
  disabled = false,
  layout = "inline",
  control = "auto",
  className,
  labelClassName,
  labelStyle,
  controlClassName,
}) => {
  const { ref, dataAttributes } =
    useSettingsControlHighlight<HTMLDivElement>(controlId);

  const saveMark = useSettingsKeysSaveMark(
    settingKeys ?? (controlId ? getControlSettingKeys(controlId) : undefined),
  );

  const saveBadge = saveMark ? (
    <SettingsSaveBadge
      key={saveMark.at}
      status={saveMark.status}
      className="ll:ml-1.5 ll:size-3.5"
    />
  ) : null;

  const stacked = layout === "stacked";
  const wide = control === "wide";

  return (
    <div
      ref={ref}
      {...dataAttributes}
      className={cn(
        "ll:flex ll:min-h-6 ll:rounded-sm ll:px-2 ll:py-1.5 ll:transition-[background-color,box-shadow] ll:duration-500 ll:hover:bg-white/5 ll:hover:duration-150 ll:data-[settings-highlighted]:duration-150 ll:data-[settings-highlighted]:bg-primary/15 ll:data-[settings-highlighted]:shadow-[inset_0_0_0_1px_var(--color-primary)]",
        stacked
          ? "ll:flex-col ll:items-stretch ll:gap-1.5"
          : "ll:items-center ll:justify-between ll:gap-4",
        !stacked &&
          wide &&
          "ll:@max-[384px]/settings:flex-col ll:@max-[384px]/settings:items-stretch ll:@max-[384px]/settings:gap-1.5",
        disabled && "ll:opacity-60",
        className,
      )}
    >
      <div className="ll:min-w-0 ll:flex-1">
        {htmlFor ? (
          <label
            htmlFor={htmlFor}
            className={cn(
              "ll-custom-cursor-pointer ll:flex ll:items-center ll:text-[13px] ll:leading-[18px] ll:text-foreground",
              labelClassName,
            )}
            style={labelStyle}
          >
            {label}
            {saveBadge}
          </label>
        ) : (
          <div
            className={cn(
              "ll:flex ll:items-center ll:text-[13px] ll:leading-[18px] ll:text-foreground",
              labelClassName,
            )}
            style={labelStyle}
          >
            {label}
            {saveBadge}
          </div>
        )}
        {description ? (
          <p
            className={cn(
              "ll:m-0 ll:mt-0.5 ll:text-xs ll:leading-4 ll:text-muted-foreground",
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
          stacked && "ll:pt-0.5",
          !stacked && wide && SETTINGS_WIDE_CONTROL_CLASS_NAME,
          !stacked && wide && "ll:@max-[384px]/settings:w-full",
          controlClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
