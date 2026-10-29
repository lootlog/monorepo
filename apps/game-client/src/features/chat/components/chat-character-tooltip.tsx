import { TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatMessageResponseDtoOutputCharacterData } from "@lootlog/client/main";
import type { FC, ReactElement } from "react";
import { useChatPopups } from "./chat-popups-context";

type ChatCharacterTooltipProps = {
  character: ChatMessageResponseDtoOutputCharacterData;
  children: ReactElement;
};

export const ChatCharacterTooltip: FC<ChatCharacterTooltipProps> = ({
  character,
  children,
}) => {
  const { characterTooltip } = useChatPopups();

  return (
    <TooltipTrigger
      handle={characterTooltip}
      payload={character}
      asChild
      className="ll:cursor-pointer"
    >
      {children}
    </TooltipTrigger>
  );
};
