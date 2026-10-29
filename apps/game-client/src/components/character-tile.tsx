import { CharacterSprite } from "@/components/character-sprite";
import { cn } from "cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { useContext, type FC } from "react";
import { CharacterTileTooltipContent } from "./character-tile-tooltip-content";
import {
  CharacterTileTooltipContext,
  type CharacterTileCharacter,
} from "./character-tile-tooltip-context";

type CharacterTileProps = {
  character: CharacterTileCharacter;
  className?: string;
  isAfk?: boolean;
};

export const CharacterTile: FC<CharacterTileProps> = ({
  character,
  className,
  isAfk = false,
}) => {
  const sharedTooltip = useContext(CharacterTileTooltipContext);

  const sprite = (
    <CharacterSprite
      icon={character.icon}
      className={cn(
        "ll:relative ll-custom-cursor-pointer ll:rounded-lg",
        className,
      )}
    >
      {isAfk ? (
        <>
          <span className="ll:absolute ll:inset-0 ll:rounded-lg ll:bg-black/35 ll:pointer-events-none" />
          <AlertTriangle className="ll:absolute ll:-right-0.5 ll:-top-0.5 ll:z-10 ll:h-5 ll:w-5 ll:text-orange-500" />
        </>
      ) : null}
    </CharacterSprite>
  );

  if (sharedTooltip) {
    return (
      <TooltipTrigger handle={sharedTooltip} payload={character} asChild>
        {sprite}
      </TooltipTrigger>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{sprite}</TooltipTrigger>
      <TooltipContent>
        <CharacterTileTooltipContent character={character} />
      </TooltipContent>
    </Tooltip>
  );
};
