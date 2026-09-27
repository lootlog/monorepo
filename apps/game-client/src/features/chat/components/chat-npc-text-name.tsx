import { cn } from "cn";
import type { ChatMessageResponseDtoOutputNpc as ChatNpc } from "@lootlog/client/main";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { FC } from "react";
import { CountBadge } from "@/components/count-badge";
import { ChatNpcTooltip } from "./chat-npc-tooltip";

type ChatNpcTextNameProps = {
  appearance: ChatAppearanceSettings;
  backgroundColor: string;
  count: number;
  isMsgYesterday: boolean;
  npc: ChatNpc;
  textColor: string;
};

export const ChatNpcTextName: FC<ChatNpcTextNameProps> = ({
  appearance,
  backgroundColor,
  count,
  isMsgYesterday,
  npc,
  textColor,
}) => (
  <>
    <ChatNpcTooltip appearance={appearance} npc={npc}>
      <span
        className={cn(
          "ll:rounded-sm ll:px-0.5 ll:font-semibold ll:select-text",
          { "ll:text-gray-100": isMsgYesterday },
        )}
        style={{ backgroundColor, color: textColor }}
      >
        {npc.name}
      </span>
    </ChatNpcTooltip>{" "}
    <CountBadge count={count} />
  </>
);
