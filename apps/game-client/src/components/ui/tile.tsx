import { cn } from "cn";
import type { CSSProperties, FC, ReactNode } from "react";

type TileProps = {
  children?: ReactNode;
  id?: string;
  className?: string;
  style?: CSSProperties;
  onDoubleClick?: () => void;
};

/**
 * Neutral bordered surface. Feature colouring comes in through `className`
 * and `style`; a `--ll-tile-bg-hover` variable in `style` drives the hover
 * background so no React state is needed per tile.
 */
export const Tile: FC<TileProps> = ({
  children,
  id,
  className,
  style,
  onDoubleClick,
}) => (
  <span
    id={id}
    className={cn(
      "ll-custom-cursor-pointer ll:w-full ll:flex ll:items-center ll:justify-center ll:border-border ll:border ll:rounded-sm ll:py-0.5 ll:bg-secondary ll:transition-colors ll:motion-reduce:transition-none",
      style?.backgroundColor
        ? "ll:hover:bg-(--ll-tile-bg-hover)"
        : "ll:hover:bg-accent",
      className,
    )}
    style={style}
    onDoubleClick={onDoubleClick}
  >
    {children}
  </span>
);
