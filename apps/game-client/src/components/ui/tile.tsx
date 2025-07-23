import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { cn } from "@/lib/utils";
import { FC } from "react";

export type TileProps = {
  children?: React.ReactNode;
  id?: string;
  color?: keyof typeof TIMERS_COLORS;
  className?: string;
  onClick?: () => void;
};

export const Tile: FC<TileProps> = ({
  children,
  id,
  color,
  className = "",
  onClick = () => {},
}) => {
  const borderColor = TIMERS_COLORS[color ?? "white"]?.border;
  const bgColor = TIMERS_COLORS[color ?? "white"]?.bg;

  return (
    <span
      id={id}
      className={cn(
        "ll-custom-cursor-pointer ll-w-full ll-flex ll-items-center ll-justify-center ll-border-solid ll-border-gray-400 ll-box-border ll-border ll-rounded-sm ll-py-0.5 ll-bg-gray-500/30 hover:ll-bg-gray-400/30 ll-transition-all",
        borderColor,
        bgColor,
        className
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );
};
