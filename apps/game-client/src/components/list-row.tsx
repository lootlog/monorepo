import { cn } from "cn";
import type { CSSProperties, FC, ReactNode } from "react";

type ListRowProps = {
  children: ReactNode;
  className?: string;
  fill?: string;
  id?: string;
  onDoubleClick?: () => void;
  style?: CSSProperties;
};

export const veilColor = (color: string, overlay: string) =>
  `color-mix(in srgb, ${color}, ${overlay})`;

export const ListRow: FC<ListRowProps> = ({
  children,
  className,
  fill = "transparent",
  id,
  onDoubleClick,
  style,
}) => (
  <span
    id={id}
    className={cn(
      "ll-custom-cursor-pointer ll:flex ll:w-full ll:min-w-0 ll:items-center ll:gap-1 ll:px-[6px] ll:font-semibold ll:bg-[var(--ll-list-row-fill)] ll:shadow-[inset_0_-1px_0_rgb(255_255_255/0.08)] ll:hover:bg-[color-mix(in_srgb,var(--ll-list-row-fill),rgba(255,255,255,0.75)_12%)] ll:transition-colors ll:motion-reduce:transition-none",
      className,
    )}
    onDoubleClick={onDoubleClick}
    style={{
      "--ll-list-row-fill": fill,
      ...style,
    }}
  >
    {children}
  </span>
);
