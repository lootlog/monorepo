import { NpcTile } from "@/components/npc-tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatMessageResponseDtoOutputNpc as ChatNpc } from "@lootlog/client/main";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { FC, ReactElement } from "react";
import {
  getChatNpcCoordinatesLabel,
  getChatNpcLocationName,
  toChatGameNpc,
} from "./chat-message.helpers";

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
    <Tooltip>
      <TooltipTrigger asChild className="ll:cursor-pointer">
        {children}
      </TooltipTrigger>
      <TooltipContent className="ll:px-2 ll:py-1.5">
        <div className="ll:flex ll:items-center ll:gap-2">
          {appearance.showNpcAvatar ? (
            <NpcTile
              className="ll:h-auto ll:max-h-8 ll:w-auto ll:max-w-8 ll:object-contain"
              containerClassName="ll:size-8 ll:shrink-0 ll:items-center"
              npc={toChatGameNpc(npc)}
            />
          ) : null}
          {details ? <span>{details}</span> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
