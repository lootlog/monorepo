import { useMemberColor } from "@/hooks/discord/use-member-color";
import { cn } from "@/lib/utils";
import { useState, type FC } from "react";
import { MessageType } from "@/api/chat.api";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { MemberSummaryResponseDtoOutput as GuildMember } from "@lootlog/api-client/models/main/member-summary-response-dto-output";
import type { ChatAppearanceSettings, NpcTypeColors } from "@lootlog/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useGameStore } from "@/store/game.store";
import { PartyGatheringCard } from "./party-gathering-card";
import {
  getChatMessageBody,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";
import { ChatNpcMessage } from "@/features/chat/components/chat-npc-message";
import { canReplyToChatMessage } from "@/features/chat/chat-reply.helpers";
import {
  getChatMentionSegments,
  type ChatMentionContext,
} from "@/features/chat/chat-mentions.helpers";
import { ChatMentionText } from "@/features/chat/components/chat-mention-text";
import { Input } from "@/components/ui/input";
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
import { ChatReplyPreview } from "@/features/chat/components/chat-reply-preview";
import { dispatchChatScrollToMessage } from "@/features/chat/chat-scroll-to-message";
import { Button } from "@/components/ui/button";
import { updateChatMessagesCache } from "@/features/chat/chat-query-cache.helpers";
import { ChatCharacterTooltip } from "@/features/chat/components/chat-character-tooltip";
import { ChatPlayerMessageView } from "@/features/chat/components/chat-player-message-view";
import {
  inviteCharacterToFriends,
  inviteCharacterToParty,
  showCharacterEquipment,
  showCharacterProfile,
  startPrivateMessage,
} from "@/lib/margonem-runtime/adapters/character-action-runtime-adapter";

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
      },
    });
  const canEditMessage = message.canEdit;
  const canDeleteMessage = message.canDelete;
  const canReplyMessage = canReplyToChatMessage(message);
  const senderName =
    member?.name ?? message.characterData?.nick ?? t("contextMenu.unknownUser");
  const mentionSegments = messageBody
    ? getChatMentionSegments(messageBody.text, mentionContext)
    : [];

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
          body={
            isEditing ? (
              <form
                className="ll:inline-flex ll:w-full ll:max-w-full ll:items-center ll:gap-[var(--ll-chat-space-sm)]"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateChatMessageMutation({
                    pathParams: {
                      guildId: message.guildId,
                      messageId: message.id,
                    },
                    data: {
                      message: draftMessage.trim(),
                    },
                  });
                }}
              >
                <Input
                  value={draftMessage}
                  disabled={isUpdating}
                  maxLength={128}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  className="ll:h-[var(--ll-chat-control-height)] ll:flex-1"
                />
                <Button
                  type="submit"
                  disabled={isUpdating || draftMessage.trim().length === 0}
                >
                  {t("edit.save")}
                </Button>
                <Button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    setDraftMessage(message.message);
                    setIsEditing(false);
                  }}
                >
                  {t("edit.cancel")}
                </Button>
              </form>
            ) : (
              <span
                className="ll:whitespace-pre-wrap ll:select-text"
                style={{
                  overflowWrap: "anywhere",
                  wordBreak: "normal",
                }}
              >
                {message.replyTo && (
                  <ChatReplyPreview
                    reply={message.replyTo}
                    onClick={scrollToOriginalMessage}
                    className="ll:mb-[var(--ll-chat-space-sm)] ll:max-w-[24rem]"
                  />
                )}
                {messageBody && (
                  <span
                    className={cn("ll:select-text", {
                      "ll:text-gray-200": isMsgYesterday,
                    })}
                    style={{ color: messageBody.color }}
                  >
                    <ChatMentionText segments={mentionSegments} />
                  </span>
                )}
              </span>
            )
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

      <ContextMenuContent className="ll:w-48 ll:flex ll:flex-col">
        {message.characterData.nick !== heroName && (
          <ContextMenuItem
            onClick={() => {
              startPrivateMessage(message.characterData.nick);
            }}
          >
            {t("contextMenu.sendMessage")}
          </ContextMenuItem>
        )}
        {canReplyMessage && onReply && (
          <ContextMenuItem onClick={onReply}>
            {t("contextMenu.reply")}
          </ContextMenuItem>
        )}
        {canEditMessage && (
          <ContextMenuItem
            disabled={isUpdating || isDeleting}
            onClick={() => {
              setDraftMessage(message.message);
              setIsEditing(true);
            }}
          >
            {t("contextMenu.edit")}
          </ContextMenuItem>
        )}
        {canDeleteMessage && (
          <ContextMenuItem
            disabled={isUpdating || isDeleting}
            onClick={() => {
              deleteChatMessageMutation({
                pathParams: {
                  guildId: message.guildId,
                  messageId: message.id,
                },
              });
            }}
          >
            {t("contextMenu.delete")}
          </ContextMenuItem>
        )}
        {gameInterface === "ni" && (
          <ContextMenuItem
            onClick={() => {
              showCharacterEquipment({
                id: message.characterData.id,
                nick: message.characterData.nick,
                prof: message.characterData.prof,
                icon: message.characterData.icon,
                lvl: message.characterData.lvl,
                account: message.characterData.acc,
              });
            }}
          >
            {t("contextMenu.showEquipment")}
          </ContextMenuItem>
        )}
        {message.characterData.nick !== heroName && (
          <ContextMenuItem
            onClick={() => {
              inviteCharacterToFriends(message.characterData.nick);
            }}
          >
            {t("contextMenu.inviteFriends")}
          </ContextMenuItem>
        )}
        {message.characterData.nick !== heroName && (
          <ContextMenuItem
            onClick={() => {
              inviteCharacterToParty(message.characterData.id);
            }}
          >
            {t("contextMenu.inviteParty")}
          </ContextMenuItem>
        )}
        {gameInterface === "ni" && (
          <ContextMenuItem
            onClick={() => {
              showCharacterProfile({
                accountId: message.characterData.acc,
                characterId: message.characterData.id,
              });
            }}
          >
            {t("contextMenu.showProfile")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
