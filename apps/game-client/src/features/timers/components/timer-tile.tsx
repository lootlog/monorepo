import { COLORS } from "@/features/timers/components/single-timer";
import { cn } from "@/lib/utils";
import { FC } from "react";

export type TimerTileProps = {
  children?: React.ReactNode;
  id?: string;
  color?: keyof typeof COLORS;
  className?: string;
};

export const TimerTile: FC<TimerTileProps> = ({
  children,
  id,
  color,
  className = "",
}) => {
  const borderColor = COLORS[color ?? "white"].border;

  return (
    <div
      id={id}
      className={cn(
        "ll-custom-cursor-pointer ll-w-full ll-flex ll-items-center ll-justify-center ll-border-solid ll-border-gray-400 ll-box-border ll-border ll-rounded-sm ll-py-0.5 ll-bg-gray-500/30 hover:ll-bg-gray-400/30 ll-transition-all",
        borderColor,
        className
      )}
    >
      {children}
    </div>
  );
};
