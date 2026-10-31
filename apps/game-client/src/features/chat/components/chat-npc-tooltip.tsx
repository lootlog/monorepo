import { TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatMessageResponseDtoOutputNpc as ChatNpc } from "@lootlog/client/main";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { FC, ReactElement } from "react";
import {
  getChatNpcCoordinatesLabel,
  getChatNpcLocationName,
} from "./chat-message.helpers";
import { useChatPopups } from "./chat-popups-context";

type ChatNpcTooltipProps = {
  appearance: ChatAppearanceSettings;
  children: ReactElement;
  npc: ChatNpc;
};

export const ChatNpcTooltip: FC<ChatNpcTooltipProps> = ({
  appearance,
  children,
  npc,
}) => {
  const { npcTooltip } = useChatPopups();
  const showLocation = appearance.showNpcLocationAndCoordinates;

  const details = [
    appearance.showNpcLevel ? `(${npc.lvl}${npc.prof})` : "",
    showLocation ? getChatNpcLocationName(npc) : "",
    showLocation ? getChatNpcCoordinatesLabel(npc) : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!appearance.showNpcAvatar && !details) return children;

  return (
    <TooltipTrigger
      handle={npcTooltip}
      payload={{ details, npc, showAvatar: appearance.showNpcAvatar }}
      asChild
      className="ll:cursor-pointer"
    >
      {children}
    </TooltipTrigger>
  );
};
