import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import type { MargonemCharacter } from "@/api/characters.api";
import { cn } from "cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import type { FC } from "react";

type CharacterTileProps = {
  character: MargonemCharacter;
  className?: string;
  isAfk?: boolean;
};

export const CharacterTile: FC<CharacterTileProps> = ({
  character,
  className,
  isAfk = false,
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
        >
          {isAfk ? (
            <>
              <span className="ll:absolute ll:inset-0 ll:rounded-lg ll:bg-black/35 ll:pointer-events-none" />
              <AlertTriangle className="ll:absolute ll:-right-0.5 ll:-top-0.5 ll:z-10 ll:h-5 ll:w-5 ll:text-orange-500" />
            </>
          ) : null}
        </div>
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
