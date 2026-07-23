import { CharacterTile } from "@/components/character-tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatMessageResponseDtoOutputCharacterData } from "@lootlog/api-client/models/main/chat-message-response-dto-output-character-data";
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
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent className="ll:bg-black ll:px-1.5 ll:py-1">
      <div className="ll:flex ll:items-center ll:gap-1">
        <CharacterTile
          character={character}
          className="ll:max-h-6 ll:origin-left ll:scale-75 ll:-my-1 ll:-ml-1"
        />
        <div className="ll:leading-tight">
          <div className="ll:font-semibold ll:text-[11px]">
            {character.nick} ({character.lvl}
            {character.prof})
          </div>
        </div>
      </div>
    </TooltipContent>
  </Tooltip>
);
