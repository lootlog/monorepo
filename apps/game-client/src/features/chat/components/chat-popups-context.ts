import type { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type {
  ChatMessageResponseDtoOutputCharacterData as ChatCharacter,
  ChatMessageResponseDtoOutputNpc as ChatNpc,
} from "@lootlog/client/main";
import { createContext, useContext } from "react";

export type ChatNpcTooltipPayload = {
  details: string;
  npc: ChatNpc;
  showAvatar: boolean;
};

type ChatPopups = {
  characterTooltip: BaseTooltip.Handle<ChatCharacter>;
  npcTooltip: BaseTooltip.Handle<ChatNpcTooltipPayload>;
};

export const ChatPopupsContext = createContext<ChatPopups | null>(null);

export const useChatPopups = () => {
  const popups = useContext(ChatPopupsContext);

  if (!popups) {
    throw new Error("useChatPopups requires ChatTranscriptPopups");
  }

  return popups;
};
