import { cn } from "cn";
import type { FC } from "react";

type SettingsColorSwatchProps = {
  borderColor: string;
  backgroundColor: string;
  className?: string;
};

/** Small preview of a border + background colour pair. */
export const SettingsColorSwatch: FC<SettingsColorSwatchProps> = ({
  borderColor,
  backgroundColor,
  className,
}) => (
  <span
    aria-hidden
    className={cn(
      "ll:block ll:h-4 ll:w-7 ll:shrink-0 ll:rounded-sm ll:border",
      className,
    )}
    style={{ borderColor, backgroundColor }}
  />
);
