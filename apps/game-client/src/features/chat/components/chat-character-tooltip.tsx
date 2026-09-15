import { CharacterTile } from "@/components/character-tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatMessageResponseDtoOutputCharacterData } from "@lootlog/client/main";
import type { FC, ReactElement } from "react";

type ChatCharacterTooltipProps = {
  character: ChatMessageResponseDtoOutputCharacterData;
  children: ReactElement;
};

export const ChatCharacterTooltip: FC<ChatCharacterTooltipProps> = ({
  character,
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild className="ll:cursor-pointer">
      {children}
    </TooltipTrigger>
    <TooltipContent className="ll:px-2 ll:py-1.5">
      <div className="ll:flex ll:items-center ll:gap-2">
        <CharacterTile
          character={character}
          className="ll:max-h-6 ll:origin-left ll:scale-75 ll:-my-1 ll:-mr-2"
        />
        <span className="ll:font-semibold">
          {character.nick} ({character.lvl}
          {character.prof})
        </span>
      </div>
    </TooltipContent>
  </Tooltip>
);
