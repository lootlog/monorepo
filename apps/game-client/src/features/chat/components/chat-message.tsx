import { NPC_NAMES } from "@/constants/margonem";
import { ChatMessage as ChatMessageType } from "@/hooks/api/use-chat-messages";
import { GuildMember } from "@/hooks/api/use-guild-members";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { cn } from "@/lib/utils";
import { decomposeChatMessage } from "@/utils/chat/decompose-chat-message";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { format } from "date-fns";
import { FC } from "react";

export type ChatMessageProps = {
  message: ChatMessageType;
  member?: GuildMember;
};

export const ChatMessage: FC<ChatMessageProps> = ({ message, member }) => {
  const memberColor = useMemberColor(member);

  const renderChatMessage = (message: ChatMessageType) => {
    const messageData = decomposeChatMessage(message.message);

    if (messageData.npc) {
      const shortname = NPC_NAMES[messageData.npc.npcType]?.shortname;
      const color = getTextColor(messageData.npc.npcType, true);

      return (
        <span style={{ color }}>
          [{shortname}] {messageData.npc.npcName}{" "}
          {messageData.npc.npcLocation
            ? `- ${messageData.npc.npcLocation}`
            : ""}
        </span>
      );
    }

    return <span>{messageData.baseMessage}</span>;
  };

  return (
    <div
      key={message.id}
      className="ll-text-white ll-text-xs ll-whitespace-pre-wrap ll-break-words ll-[overflow-wrap:anywhere] ll-w-[calc(100%-1rem)]"
    >
      <span className="ll-inline-block ll-whitespace-nowrap">
        <span className="ll-text-[11px]">
          [{format(new Date(message.timestamp), "HH:mm")}]
        </span>{" "}
        <span
          className={cn("ll-font-bold ll-mx-1")}
          style={{ color: `#${memberColor}` }}
        >
          {member?.name || "Nieznany"}:
        </span>
      </span>{" "}
      <span className="ll-break-words ll-[overflow-wrap:anywhere]">
        {renderChatMessage(message)}
      </span>
    </div>
  );
};
