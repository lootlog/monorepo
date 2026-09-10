import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { Copy, MapPin } from "lucide-react";
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
import { ChatNpcMessageView } from "./chat-npc-message-view";
import { ChatNpcHideTypeMenuItem } from "./chat-npc-hide-type-menu-item";

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
  const { t } = useTranslation("chat");
  const memberColor = useMemberColor(member);

  if (!message.npc || !guildName) return null;

  const location = getChatNpcLocation(message.npc);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => void copyChatText(message.message)}>
          <Copy
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("messageActions.copy")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void copyChatText(location)}>
          <MapPin
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("messageActions.copyLocation")}
        </ContextMenuItem>
        <ChatNpcHideTypeMenuItem npc={message.npc} />
      </ContextMenuContent>
    </ContextMenu>
  );
};
