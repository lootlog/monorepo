import { cn } from "cn";
import type { FC } from "react";

type TileProps = {
  children?: React.ReactNode;
  id?: string;
  className?: string;
  onDoubleClick?: () => void;
};

export const Tile: FC<TileProps> = ({
  children,
  id,
  className = "",
  onDoubleClick,
}) => (
  <span
    id={id}
    className={cn(
      "ll-custom-cursor-pointer ll:w-full ll:flex ll:items-center ll:justify-center ll:border-border ll:border ll:rounded-sm ll:py-0.5 ll:bg-secondary ll:hover:bg-accent ll:transition-colors ll:motion-reduce:transition-none",
      className,
    )}
    onDoubleClick={onDoubleClick}
  >
    {children}
  </span>
);
