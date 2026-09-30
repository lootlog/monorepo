import { getSubtleBackgroundColor } from "@/utils/notifications-and-detector/background";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import { NpcType } from "@/api/npcs.api";
import { Message } from "@/components/ui/message";
import { cn } from "cn";
import { format } from "@/utils/local-date";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import type { FC, ReactElement, ReactNode } from "react";
import {
  getChatNpcTextColor,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";
import { ChatNpcBubble } from "./chat-npc-bubble";
import { ChatNpcTextName } from "./chat-npc-text-name";

type ChatNpcMessageViewProps = {
  all: boolean;
  appearance?: ChatAppearanceSettings;
  count?: number;
  guildName: string;
  memberColor: string;
  message: ChatMessageType;
  npcTypeColors?: NpcTypeColors;
  senderName: string;
  wrapSender?: (sender: ReactElement) => ReactNode;
};

export const ChatNpcMessageView: FC<ChatNpcMessageViewProps> = (props) => {
  const {
    all,
    guildName,
    memberColor,
    message,
    npcTypeColors,
    senderName,
    wrapSender,
  } = props;

  const appearance = props.appearance ?? CHAT_APPEARANCE_READABLE_PRESET;
  const count = props.count ?? 1;
  const npc = message.npc;

  if (!npc) return null;

  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);
  const npcTextColor = getChatNpcTextColor(npc, npcTypeColors);

  const npcBackgroundColor = getSubtleBackgroundColor(
    getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type),
    npcTypeColors,
  );

  const sender = (
    <span
      className={cn("ll:select-text ll:font-bold", {
        "ll:text-gray-100": isMsgYesterday,
      })}
      style={{ color: `#${memberColor}` }}
    >
      {senderName}:
    </span>
  );

  return (
    <Message
      className="ll:cursor-text ll:select-text"
      data-chat-message-id={message.id}
    >
      <div
        className="ll:mb-[var(--ll-chat-space-xs)] ll:min-w-0 ll:max-w-full"
        style={{ overflowWrap: "anywhere" }}
      >
        {appearance.showTimestamp ? (
          <span
            className={cn(
              "ll:select-text ll:text-[length:var(--ll-chat-meta-font-size)] ll:leading-[var(--ll-chat-meta-line-height)]",
              { "ll:opacity-50": isMsgYesterday },
            )}
          >
            [{format(new Date(message.timestamp), "HH:mm")}]
          </span>
        ) : null}{" "}
        {all && appearance.showGuildLabel ? (
          <span
            className={cn("ll:mr-0.5 ll:select-text ll:font-bold", {
              "ll:opacity-50": isMsgYesterday,
            })}
          >
            [{guildName}]{" "}
          </span>
        ) : null}
        {wrapSender ? wrapSender(sender) : sender}{" "}
        {appearance.npcLayout === "text" ? (
          <ChatNpcTextName
            appearance={appearance}
            backgroundColor={npcBackgroundColor}
            count={count}
            isMsgYesterday={isMsgYesterday}
            npc={npc}
            textColor={npcTextColor}
          />
        ) : null}
      </div>
      {appearance.npcLayout === "text" ? null : (
        <ChatNpcBubble
          appearance={appearance}
          backgroundColor={npcBackgroundColor}
          count={count}
          isMsgYesterday={isMsgYesterday}
          npc={npc}
          textColor={npcTextColor}
        />
      )}
    </Message>
  );
};
