import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import type { MargonemCharacter } from "@/hooks/api/use-character-list";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FC } from "react";

export type CharacterTileProps = {
  character: MargonemCharacter;
  className?: string;
};

export const CharacterTile: FC<CharacterTileProps> = ({
  character,
  className,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "ll:w-8 ll:h-12 ll:relative ll-custom-cursor-pointer ll:rounded-lg",
            className,
          )}
          style={{
            backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${character.icon})`,
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="ll:z-9999">
        <span className="ll:font-semibold">
          {character.nick} ({character.lvl}
          {character.prof})
        </span>
      </TooltipContent>
    </Tooltip>
  );
};
