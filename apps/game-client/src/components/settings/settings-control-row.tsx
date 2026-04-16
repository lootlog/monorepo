import { cn } from "@/lib/utils";
import type { CSSProperties, FC, ReactNode } from "react";

type SettingsControlRowProps = {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  controlClassName?: string;
  labelStyle?: CSSProperties;
};

export const SettingsControlRow: FC<SettingsControlRowProps> = ({
  label,
  description,
  children,
  disabled = false,
  className,
  labelClassName,
  descriptionClassName,
  controlClassName,
  labelStyle,
}) => {
  return (
    <div
      className={cn(
        "ll:flex ll:items-center ll:justify-between ll:gap-4 ll:rounded-md ll:border ll:px-3 ll:py-2 ll:transition-colors",
        disabled
          ? "ll:border-gray-700/80 ll:bg-gray-900/30 ll:opacity-60"
          : "ll:border-gray-600 ll:bg-gray-900/70 ll:hover:border-gray-500",
        className,
      )}
    >
      <div className="ll:min-w-0 ll:flex-1 ll:space-y-0.5">
        <div
          className={cn(
            "ll:text-[12px] ll:font-semibold ll:leading-4 ll:text-white",
            labelClassName,
          )}
          style={labelStyle}
        >
          {label}
        </div>
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
      <div className={cn("ll:shrink-0", controlClassName)}>{children}</div>
    </div>
  );
};
