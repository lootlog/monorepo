import { cn } from "cn";
import type { FC } from "react";

type ColorSwatchProps = {
  /** Border colour; also the fill unless `fill` is given. */
  color: string;
  fill?: string;
  className?: string;
};

/**
 * Rounded square preview of a colour, the one swatch look of the client.
 * The border is drawn as an inset ring so the rounded corners stay crisp at
 * any colour.
 */
export const ColorSwatch: FC<ColorSwatchProps> = ({
  color,
  fill,
  className,
}) => (
  <span
    aria-hidden
    className={cn(
      "ll:block ll:size-4 ll:shrink-0 ll:rounded ll:transition-[background-color,box-shadow] ll:duration-300 ll:motion-reduce:transition-none",
      className,
    )}
    style={{
      backgroundColor: fill ?? color,
      boxShadow: `inset 0 0 0 1.5px ${color}`,
    }}
  />
);
