import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import type { FC } from "react";

type CatchingCharacterOptionProps = {
  icon: string;
  nick: string;
};

/** Character avatar + name used as a picker option label. */
export const CatchingCharacterOption: FC<CatchingCharacterOptionProps> = ({
  icon,
  nick,
}) => (
  <span className="ll:inline-flex ll:min-w-0 ll:items-center ll:gap-1.5">
    <span
      aria-hidden
      className="ll:size-4 ll:shrink-0 ll:rounded-sm ll:bg-cover ll:bg-top"
      style={{
        backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${icon})`,
      }}
    />
    <span className="ll:truncate">{nick}</span>
  </span>
);
