import { useMemberColor } from "@/hooks/discord/use-member-color";
import { cn } from "cn";
import type { FC } from "react";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@lootlog/client/main";

import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useGameStore } from "@/store/game.store";
import {
  getChatMessageBody,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";
import { ChatNpcMessage } from "@/features/chat/components/chat-npc-message";
import { canReplyToChatMessage } from "@/features/chat/chat-reply.helpers";
import type { ChatMentionContext } from "@/features/chat/chat-mentions.helpers";
import { useTranslation } from "react-i18next";

import { dispatchChatScrollToMessage } from "@/features/chat/chat-scroll-to-message";
import { ChatCharacterTooltip } from "@/features/chat/components/chat-character-tooltip";
import { ChatPlayerMessageView } from "@/features/chat/components/chat-player-message-view";
import { ChatReplyPreview } from "./chat-reply-preview";
import { ChatMessageBody } from "./chat-message-body";
import { ChatMessageContextMenu } from "./chat-message-context-menu";

type ChatMessageProps = {
  all: boolean;
  appearance?: ChatAppearanceSettings;
  npcTypeColors?: NpcTypeColors;
  message: ChatMessageType;
  guildName?: string;
  member?: GuildMember;
  mentionContext?: ChatMentionContext;
  onReply?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
};

export const ChatMessage: FC<ChatMessageProps> = ({
  all,
  appearance,
  npcTypeColors,
  message,
  guildName,
  member,
  mentionContext,
  onReply,
  onDelete,
  isDeleting = false,
}) => {
  const { t } = useTranslation("chat");
  const heroName = useGameStore((state) => state.game?.hero.name);
  const gameInterface = useGameStore((state) => state.game?.interface);
  const memberColor = useMemberColor(member);
  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);
  const messageBody = getChatMessageBody(message);

  const canDeleteMessage = message.canDelete;
  const canReplyMessage = canReplyToChatMessage(message);

  const senderName =
    member?.name ?? message.characterData?.nick ?? t("contextMenu.unknownUser");

  if (!message.characterData) return null;

  if (!guildName) return null;

  if (!messageBody) return null;

  if (message.type === MessageType.NPC) {
    return (
      <ChatNpcMessage
        appearance={appearance}
        all={all}
        guildName={guildName}
        member={member}
        message={message}
        npcTypeColors={npcTypeColors}
      />
    );
  }

  const scrollToOriginalMessage = () => {
    if (!message.replyTo?.messageId) return;
    dispatchChatScrollToMessage(message.replyTo.messageId);
  };

  const actionProps = {
    canDelete: canDeleteMessage,
    canReply: canReplyMessage,
    gameInterface,
    heroName,
    isDeleting,
    message,
    onReply,
    onDelete: () => onDelete?.(),
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;

          if (
            event.key !== "ContextMenu" &&
            !(event.shiftKey && event.key === "F10")
          )
            return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          event.currentTarget.dispatchEvent(
            new MouseEvent("contextmenu", {
              bubbles: true,
              cancelable: true,
              clientX: rect.left,
              clientY: rect.top,
            }),
          );
        }}
      >
        <ChatPlayerMessageView
          all={all}
          appearance={appearance}
          body=<ChatMessageBody
            isDeleting={isDeleting}
            isMsgYesterday={isMsgYesterday}
            mentionContext={mentionContext}
            message={message}
          />
          replyPreview={
            message.replyTo ? (
              <ChatReplyPreview
                variant="compact"
                reply={message.replyTo}
                onClick={scrollToOriginalMessage}
                className="ll:mb-0.5 ll:-ml-1.5 ll:-mr-0.5 ll:w-[calc(100%+8px)] ll:max-w-none ll:pl-1.5 ll:pr-0.5"
              />
            ) : null
          }
          guildName={guildName}
          isMsgYesterday={isMsgYesterday}
          messageId={message.id}
          sender={
            <ChatCharacterTooltip character={message.characterData}>
              <span
                className={cn(
                  "ll:inline-block ll:font-bold ll:mr-0.5 ll:select-text",
                )}
                style={{ color: `#${memberColor}` }}
              >
                {senderName}:
              </span>
            </ChatCharacterTooltip>
          }
          timestamp={message.timestamp}
        />
      </ContextMenuTrigger>

      <ChatMessageContextMenu {...actionProps} />
    </ContextMenu>
  );
};
