import { useSharedContextMenuTarget } from "@/components/common/shared-context-menu-registry";
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
import { ChatNpcMessageMenu } from "./chat-npc-message-menu";

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
  const { npc } = message;

  const menuTarget = useSharedContextMenuTarget(
    message.id,
    npc && guildName
      ? {
          items: <ChatNpcMessageMenu message={message.message} npc={npc} />,
        }
      : null,
  );

  if (!npc || !guildName) return null;

  return (
    <div {...menuTarget}>
      <ChatNpcMessageView
        all={all}
        appearance={appearance}
        count={count}
        guildName={guildName}
        memberColor={memberColor}
        message={message}
        npcTypeColors={npcTypeColors}
        senderName={member?.name ?? message.characterData.nick}
        wrapSender={(sender) => (
          <ChatCharacterTooltip character={message.characterData}>
            {sender}
          </ChatCharacterTooltip>
        )}
      />
    </div>
  );
};
