import { useMemberColor } from "@/hooks/discord/use-member-color";
import { cn } from "@/lib/utils";
import { useState, type FC } from "react";
import { MessageType } from "@/api/chat.api";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { MemberSummaryResponseDtoOutput as GuildMember } from "@lootlog/api-client/models/main/member-summary-response-dto-output";
import type { ChatAppearanceSettings, NpcTypeColors } from "@lootlog/types";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useGameStore } from "@/store/game.store";
import { PartyGatheringCard } from "./party-gathering-card";
import {
  getChatMessageBody,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";
import { ChatNpcMessage } from "@/features/chat/components/chat-npc-message";
import { canReplyToChatMessage } from "@/features/chat/chat-reply.helpers";
import type { ChatMentionContext } from "@/features/chat/chat-mentions.helpers";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useChatControllerDeleteChatMessage,
  useChatControllerUpdateChatMessage,
} from "@lootlog/api-client/react-query/main/chat";
import {
  removeChatMessage,
  updateChatMessage,
} from "@/features/chat/chat.helpers";
import { dispatchChatScrollToMessage } from "@/features/chat/chat-scroll-to-message";
import { updateChatMessagesCache } from "@/features/chat/chat-query-cache.helpers";
import { ChatCharacterTooltip } from "@/features/chat/components/chat-character-tooltip";
import { ChatPlayerMessageView } from "@/features/chat/components/chat-player-message-view";
import { toast } from "sonner";
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
}) => {
  const { t } = useTranslation("chat");
  const heroName = useGameStore((state) => state.game?.hero.name);
  const gameInterface = useGameStore((state) => state.game?.interface);
  const queryClient = useQueryClient();
  const memberColor = useMemberColor(member);
  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);
  const messageBody = getChatMessageBody(message);
  const [isEditing, setIsEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState(message.message);
  const { mutate: updateChatMessageMutation, isPending: isUpdating } =
    useChatControllerUpdateChatMessage({
      mutation: {
        onSuccess: () => {
          updateChatMessagesCache({
            guildId: message.guildId,
            queryClient,
            updater: (old: ChatMessageType[] | undefined) =>
              old
                ? updateChatMessage(old, message.id, draftMessage.trim())
                : old,
          });
          setIsEditing(false);
        },
        onError: () => {
          toast.error(t("errors.editFailed"));
        },
      },
    });
  const { mutate: deleteChatMessageMutation, isPending: isDeleting } =
    useChatControllerDeleteChatMessage({
      mutation: {
        onSuccess: () => {
          updateChatMessagesCache({
            guildId: message.guildId,
            queryClient,
            updater: (old: ChatMessageType[] | undefined) =>
              old ? removeChatMessage(old, message.id) : old,
          });
        },
        onError: () => {
          toast.error(t("errors.deleteFailed"));
        },
      },
    });
  const canEditMessage = message.canEdit;
  const canDeleteMessage = message.canDelete;
  const canReplyMessage = canReplyToChatMessage(message);
  const senderName =
    member?.name ?? message.characterData?.nick ?? t("contextMenu.unknownUser");
  if (!message.characterData) return null;

  if (!guildName) return null;

  if (!messageBody && message.type !== MessageType.PARTY_GATHERING) return null;

  if (message.type === MessageType.PARTY_GATHERING) {
    return (
      <PartyGatheringCard
        message={message}
        member={member}
        guildName={guildName}
        all={all}
        isMsgYesterday={isMsgYesterday}
        showGuildLabel={appearance?.showGuildLabel}
        showTimestamp={appearance?.showTimestamp}
      />
    );
  }

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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <ChatPlayerMessageView
          all={all}
          appearance={appearance}
          body=<ChatMessageBody
            draftMessage={draftMessage}
            isDeleting={isDeleting}
            isEditing={isEditing}
            isMsgYesterday={isMsgYesterday}
            isUpdating={isUpdating}
            mentionContext={mentionContext}
            message={message}
            onCancel={() => {
              setDraftMessage(message.message);
              setIsEditing(false);
            }}
            onDraftChange={(event) => setDraftMessage(event.target.value)}
            onScrollToOriginal={scrollToOriginalMessage}
            onSubmit={(event) => {
              event.preventDefault();
              updateChatMessageMutation({
                pathParams: {
                  guildId: message.guildId,
                  messageId: message.id,
                },
                data: { message: draftMessage.trim() },
              });
            }}
          />
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

      <ChatMessageContextMenu
        canDelete={canDeleteMessage}
        canEdit={canEditMessage}
        canReply={canReplyMessage}
        gameInterface={gameInterface}
        heroName={heroName}
        isDeleting={isDeleting}
        isUpdating={isUpdating}
        message={message}
        onDelete={() => {
          deleteChatMessageMutation({
            pathParams: {
              guildId: message.guildId,
              messageId: message.id,
            },
          });
        }}
        onEdit={() => {
          setDraftMessage(message.message);
          setIsEditing(true);
        }}
        onReply={onReply}
      />
    </ContextMenu>
  );
};
