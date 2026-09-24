import { cn } from "cn";
import type { CSSProperties, FC, ReactNode } from "react";

type ListRowProps = {
  children: ReactNode;
  className?: string;
  /** Row background. Rows without a colour let the window show through. */
  fill?: string;
  id?: string;
  /**
   * Every other row gets a faint light veil, so neighbouring rows of one
   * colour stay apart while keeping their hue.
   */
  isAlternateRow?: boolean;
  onDoubleClick?: () => void;
  style?: CSSProperties;
};

const ALTERNATE_ROW_VEIL = "white 6%";

/** Mixes an overlay such as `black 40%` into a colour, keeping its alpha. */
export const veilColor = (color: string, overlay: string) =>
  `color-mix(in srgb, ${color}, ${overlay})`;

/**
 * One row of an in-game list, such as timers or online players: a
 * translucent fill over the window, edge to edge, lighter on hover.
 */
export const ListRow: FC<ListRowProps> = ({
  children,
  className,
  fill = "transparent",
  id,
  isAlternateRow = false,
  onDoubleClick,
  style,
}) => (
  <span
    id={id}
    className={cn(
      "ll-custom-cursor-pointer ll:flex ll:w-full ll:min-w-0 ll:items-center ll:gap-1 ll:px-[6px] ll:font-semibold ll:bg-[var(--ll-list-row-fill)] ll:hover:bg-[color-mix(in_srgb,var(--ll-list-row-fill),rgba(255,255,255,0.75)_12%)] ll:transition-colors ll:motion-reduce:transition-none",
      className,
    )}
    onDoubleClick={onDoubleClick}
    // SAFETY: CSSProperties has no index signature for custom properties;
    // "--ll-list-row-fill" is consumed by this element's own classes.
    style={
      {
        "--ll-list-row-fill": isAlternateRow
          ? veilColor(fill, ALTERNATE_ROW_VEIL)
          : fill,
        ...style,
      } as CSSProperties
    }
  >
    {children}
  </span>
);
