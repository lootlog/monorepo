import { useMemberColor } from "@/hooks/discord/use-member-color";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@lootlog/client/main";

import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import type { FC } from "react";
import { ChatCharacterTooltip } from "./chat-character-tooltip";
import { ChatNpcMessageView } from "./chat-npc-message-view";

type ChatNpcMessageProps = {
  all: boolean;
  appearance?: ChatAppearanceSettings;
  count?: number;
  guildName?: string;
  member?: GuildMember;
  message: ChatMessageType;
  npcTypeColors?: NpcTypeColors;
};

export const ChatNpcMessage: FC<ChatNpcMessageProps> = ({
  all,
  appearance,
  count = 1,
  guildName,
  member,
  message,
  npcTypeColors,
}) => {
  const memberColor = useMemberColor(member);
  if (!message.npc || !guildName) return null;

  return (
    <ChatNpcMessageView
      all={all}
      appearance={appearance}
      count={count}
      guildName={guildName}
      memberColor={memberColor ?? "FFF"}
      message={message}
      npcTypeColors={npcTypeColors}
      senderName={member?.name ?? message.characterData.nick}
      wrapSender={(sender) => (
        <ChatCharacterTooltip character={message.characterData}>
          {sender}
        </ChatCharacterTooltip>
      )}
    />
  );
};
