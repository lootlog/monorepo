import { cn } from "cn";
import type { FC, ReactNode } from "react";

type PlayerNameProps = {
  className?: string;
  clanName?: string;
  level: number;
  name: string;
  profession: string;
  /** Shown right after the level, before the clan, such as a badge. */
  suffix?: ReactNode;
};

/**
 * A player's nick with level and profession, then the clan, dimmed. When the
 * row is too narrow the clan gives way first, so the nick stays readable.
 */
export const PlayerName: FC<PlayerNameProps> = ({
  className,
  clanName,
  level,
  name,
  profession,
  suffix,
}) => (
  <span
    className={cn("ll:flex ll:min-w-0 ll:items-center ll:gap-1", className)}
  >
    <span className="ll:truncate">
      {name} ({level}
      {profession})
    </span>
    {suffix}
    {clanName ? (
      <span className="ll:min-w-0 ll:shrink-[9999] ll:truncate ll:font-normal ll:text-white/65">
        {clanName}
      </span>
    ) : null}
  </span>
);
