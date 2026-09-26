import { cn } from "cn";
import type { FC } from "react";

type PlayerNameProps = {
  className?: string;
  clanName?: string;
  level: number;
  name: string;
  profession: string;
};

/**
 * A player's nick with level and profession, then a faint dot and the clan,
 * dimmed. When the row is too narrow the clan gives way first, so the nick
 * stays readable.
 */
export const PlayerName: FC<PlayerNameProps> = ({
  className,
  clanName,
  level,
  name,
  profession,
}) => (
  <span
    className={cn("ll:flex ll:min-w-0 ll:items-center ll:gap-1", className)}
  >
    <span className="ll:truncate">
      {name} ({level}
      {profession})
    </span>
    {clanName ? (
      <>
        <span aria-hidden="true" className="ll:shrink-0 ll:text-white/35">
          ·
        </span>
        <span className="ll:min-w-0 ll:shrink-[9999] ll:truncate ll:font-normal ll:text-white/65">
          {clanName}
        </span>
      </>
    ) : null}
  </span>
);
