import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { SharedContextMenu } from "@/components/common/shared-context-menu";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import type { ChatMessageResponseDtoOutputCharacterData as ChatCharacter } from "@lootlog/client/main";
import { useState, type ReactElement } from "react";
import { ChatCharacterTooltipContent } from "./chat-character-tooltip-content";
import { ChatNpcTooltipContent } from "./chat-npc-tooltip-content";
import {
  ChatPopupsContext,
  type ChatNpcTooltipPayload,
} from "./chat-popups-context";

type ChatTranscriptPopupsProps = {
  /** The message list; it becomes the trigger of the shared context menu. */
  children: ReactElement;
};

/**
 * One context menu and one tooltip of each kind for every message of a
 * transcript. The transcript renders all of its messages, and a popup root per
 * message made mounting a full history take several times longer.
 */
export const ChatTranscriptPopups = ({
  children,
}: ChatTranscriptPopupsProps) => {
  const [popups] = useState(() => ({
    characterTooltip: BaseTooltip.createHandle<ChatCharacter>(),
    npcTooltip: BaseTooltip.createHandle<ChatNpcTooltipPayload>(),
  }));

  return (
    <ChatPopupsContext.Provider value={popups}>
      <SharedContextMenu>{children}</SharedContextMenu>

      <Tooltip handle={popups.characterTooltip}>
        {({ payload }) =>
          payload ? (
            <TooltipContent className="ll:px-2 ll:py-1.5">
              <ChatCharacterTooltipContent character={payload} />
            </TooltipContent>
          ) : null
        }
      </Tooltip>

      <Tooltip handle={popups.npcTooltip}>
        {({ payload }) =>
          payload ? (
            <TooltipContent className="ll:px-2 ll:py-1.5">
              <ChatNpcTooltipContent {...payload} />
            </TooltipContent>
          ) : null
        }
      </Tooltip>
    </ChatPopupsContext.Provider>
  );
};
