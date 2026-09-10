import { getTimerColor } from "@/features/timers/constants/timer-colors";
import { cn } from "cn";
import { type FC, useState } from "react";

type TileProps = {
  children?: React.ReactNode;
  id?: string;
  color?: string;
  customBorderColor?: string;
  customBackgroundColor?: string;
  className?: string;
  onDoubleClick?: () => void;
};

const increaseBrightness = (color: string, percent: number): string => {
  const hex = color.replace("#", "");
  const hasAlpha = hex.length === 8;

  const rgb = hasAlpha ? hex.slice(0, 6) : hex;
  const alpha = hasAlpha ? hex.slice(6, 8) : "";

  const num = Number.parseInt(rgb, 16);
  const amt = Math.round(2.55 * percent);

  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));

  const newColor = ((R << 16) | (G << 8) | B).toString(16).padStart(6, "0");

  return `#${newColor}${alpha}`;
};

export const Tile: FC<TileProps> = ({
  children,
  id,
  color,
  customBorderColor,
  customBackgroundColor,
  className = "",
  onDoubleClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const defaultColor = color ? getTimerColor(color) : undefined;
  const borderColor = defaultColor?.border;
  const bgColor = defaultColor?.bg;

  const customStyles: React.CSSProperties = {};

  if (customBorderColor) {
    customStyles.borderColor = customBorderColor;
  }

  if (customBackgroundColor) {
    const bgToUse = isHovered
      ? increaseBrightness(customBackgroundColor, 20)
      : customBackgroundColor;

    customStyles.backgroundColor = bgToUse;
  }

  return (
    <span
      id={id}
      className={cn(
        "ll-custom-cursor-pointer ll:w-full ll:flex ll:items-center ll:justify-center ll:border-solid ll:border-border ll:box-border ll:border ll:rounded-sm ll:py-0.5 ll:bg-secondary ll:transition-colors ll:motion-reduce:transition-none",
        !customBackgroundColor && "ll:hover:bg-accent",
        borderColor,
        bgColor,
        className,
      )}
      style={Object.keys(customStyles).length > 0 ? customStyles : undefined}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => customBackgroundColor && setIsHovered(true)}
      onMouseLeave={() => customBackgroundColor && setIsHovered(false)}
    >
      {children}
    </span>
  );
};
