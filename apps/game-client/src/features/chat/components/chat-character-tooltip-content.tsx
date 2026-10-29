import { CharacterTile } from "@/components/character-tile";
import type { ChatMessageResponseDtoOutputCharacterData } from "@lootlog/client/main";
import type { FC } from "react";

type ChatCharacterTooltipContentProps = {
  character: ChatMessageResponseDtoOutputCharacterData;
};

export const ChatCharacterTooltipContent: FC<
  ChatCharacterTooltipContentProps
> = ({ character }) => (
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
);
