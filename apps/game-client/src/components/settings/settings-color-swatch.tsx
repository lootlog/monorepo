import { cn } from "cn";
import type { FC } from "react";

type SettingsColorSwatchProps = {
  borderColor: string;
  backgroundColor: string;
  className?: string;
};

/**
 * Small square preview of a border + background colour pair. The border is
 * drawn as an inset ring so the rounded corners stay crisp at any colour.
 */
export const SettingsColorSwatch: FC<SettingsColorSwatchProps> = ({
  borderColor,
  backgroundColor,
  className,
}) => (
  <span
    aria-hidden
    className={cn("ll:block ll:size-4 ll:shrink-0 ll:rounded", className)}
    style={{
      backgroundColor,
      boxShadow: `inset 0 0 0 1.5px ${borderColor}`,
    }}
  />
);
