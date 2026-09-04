import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { cn } from "cn";

type PlayerSpriteTileProps = {
  icon?: string | null;
  idx?: number;
  color?: string;
  className?: string;
  cdnBaseUrl?: string;
  wrapperClassName?: string;
  tileClassName?: string;
  defaultBadgeColor?: string;
};

export const PlayerSpriteTile = ({
  icon,
  idx,
  color,
  className,
  cdnBaseUrl = MARGONEM_CDN_CHARACTERS_URL,
  wrapperClassName = "relative scale-90 origin-top",
  tileClassName,
  defaultBadgeColor = "var(--background)",
}: PlayerSpriteTileProps) => {
  return (
    <div className={cn(wrapperClassName, className)}>
      <div
        className={cn(
          "w-[32px] h-[48px] relative cursor-pointer rounded-lg bg-muted/30 transition-colors duration-200 hover:bg-muted/50",
          tileClassName,
        )}
        style={{
          backgroundImage: `url(${cdnBaseUrl}${icon})`,
          backgroundColor: "transparent",
        }}
      />
      {idx !== undefined && (
        <div
          className="top-10 -right-1 absolute size-4 rounded-sm box-content text-xs flex items-center justify-center font-medium shadow-sm"
          style={{
            backgroundColor: color ? `${color}` : defaultBadgeColor,
          }}
        >
          {idx + 1}
        </div>
      )}
    </div>
  );
};
