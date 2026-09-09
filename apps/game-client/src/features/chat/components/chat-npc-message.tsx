import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { useTranslation } from "react-i18next";
import { copyChatText } from "../chat-copy-text";
import { getChatNpcLocation } from "./chat-message.helpers";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@lootlog/client/main";

import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import type { FC } from "react";
import { ChatCharacterTooltip } from "./chat-character-tooltip";
import { ChatNpcMessageActions } from "./chat-npc-message-actions";
import { ChatNpcMessageView } from "./chat-npc-message-view";

type ChatNpcMessageProps = {
  onReply?: () => void;
  onMention?: () => void;
  all: boolean;
  appearance?: ChatAppearanceSettings;
  count?: number;
  guildName?: string;
  member?: GuildMember;
  message: ChatMessageType;
  npcTypeColors?: NpcTypeColors;
};

export const ChatNpcMessage: FC<ChatNpcMessageProps> = ({
  onReply,
  onMention,
  all,
  appearance,
  count = 1,
  guildName,
  member,
  message,
  npcTypeColors,
}) => {
  const { t } = useTranslation("chat");
  const memberColor = useMemberColor(member);
  if (!message.npc || !guildName) return null;

  const location = getChatNpcLocation(message.npc);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <ChatNpcMessageView
          actions=<ChatNpcMessageActions
            message={message}
            onReply={onReply}
            onMention={onMention}
          />
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => void copyChatText(message.message)}>
          {t("messageActions.copy")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void copyChatText(location)}>
          {t("messageActions.copyLocation")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
