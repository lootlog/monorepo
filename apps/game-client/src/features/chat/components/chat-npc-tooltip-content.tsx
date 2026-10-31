import { NpcTile } from "@/components/npc-tile";
import type { FC } from "react";
import { toChatGameNpc } from "./chat-message.helpers";
import type { ChatNpcTooltipPayload } from "./chat-popups-context";

export const ChatNpcTooltipContent: FC<ChatNpcTooltipPayload> = ({
  details,
  npc,
  showAvatar,
}) => (
  <div className="ll:flex ll:items-center ll:gap-2">
    {showAvatar ? (
      <NpcTile
        className="ll:h-auto ll:max-h-8 ll:w-auto ll:max-w-8 ll:object-contain"
        containerClassName="ll:size-8 ll:shrink-0 ll:items-center"
        npc={toChatGameNpc(npc)}
      />
    ) : null}
    {details ? <span>{details}</span> : null}
  </div>
);
