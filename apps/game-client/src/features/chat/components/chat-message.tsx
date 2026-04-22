import { useMemberColor } from "@/hooks/discord/use-member-color";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, type FC } from "react";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@/lib/api/generated/main/model";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CharacterTile } from "@/components/character-tile";
import { Game } from "@/lib/game";
import { PartyGatheringCard } from "./party-gathering-card";
import {
  getChatMessageBody,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  getChatControllerGetChatMessagesQueryKey,
  useChatControllerDeleteChatMessage,
  useChatControllerUpdateChatMessage,
} from "@/lib/api/generated/main/chat/chat";
import {
  removeChatMessage,
  updateChatMessage,
} from "@/features/chat/chat.helpers";

type ChatMessageProps = {
  all: boolean;
  message: ChatMessageType;
  guildName?: string;
  member?: GuildMember;
};

export const ChatMessage: FC<ChatMessageProps> = ({
  all,
  message,
  guildName,
  member,
}) => {
  const { t } = useTranslation("chat");
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
          queryClient.setQueryData(
            getChatControllerGetChatMessagesQueryKey({
              guildId: message.guildId,
            }),
            (old: ChatMessageType[] | undefined) =>
              old
                ? updateChatMessage(old, message.id, draftMessage.trim())
                : old,
          );
          setIsEditing(false);
        },
      },
    });
  const { mutate: deleteChatMessageMutation, isPending: isDeleting } =
    useChatControllerDeleteChatMessage({
      mutation: {
        onSuccess: () => {
          queryClient.setQueryData(
            getChatControllerGetChatMessagesQueryKey({
              guildId: message.guildId,
            }),
            (old: ChatMessageType[] | undefined) =>
              old ? removeChatMessage(old, message.id) : old,
          );
        },
      },
    });
  const canEditMessage = message.canEdit;
  const canDeleteMessage = message.canDelete;
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
      />
    );
  }

  return (
    <div
      key={`${message.id}-${message.guildId}`}
      className="ll:text-white ll:text-xs ll:w-full ll:select-text ll:cursor-text"
    >
      <ContextMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuTrigger>
              <span className="ll:inline-block ll:select-text">
                <span
                  className={cn("ll:text-[11px] ll:select-text", {
                    "ll:opacity-50": isMsgYesterday,
                  })}
                >
                  [{format(new Date(message.timestamp), "HH:mm")}]
                </span>{" "}
                {all && (
                  <span
                    className={cn("ll:font-bold ll:mr-0.5 ll:select-text", {
                      "ll:opacity-50": isMsgYesterday,
                    })}
                  >
                    [{guildName}]{" "}
                  </span>
                )}
                <span
                  className={cn("ll:font-bold ll:mr-0.5 ll:select-text", {
                    "ll:opacity-50": isMsgYesterday,
                  })}
                  style={{ color: `#${memberColor}` }}
                >
                  {senderName}:
                </span>
              </span>{" "}
              {isEditing ? (
                <form
                  className="ll:inline-flex ll:w-full ll:max-w-full ll:items-center ll:gap-1"
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
                    className="ll:h-5 ll:flex-1"
                  />
                  <button
                    type="submit"
                    disabled={isUpdating || draftMessage.trim().length === 0}
                    className="ll:text-[10px] ll:text-blue-300 ll:hover:text-blue-200 ll:disabled:opacity-50"
                  >
                    {t("edit.save")}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    className="ll:text-[10px] ll:text-gray-400 ll:hover:text-gray-300 ll:disabled:opacity-50"
                    onClick={() => {
                      setDraftMessage(message.message);
                      setIsEditing(false);
                    }}
                  >
                    {t("edit.cancel")}
                  </button>
                </form>
              ) : (
                <span
                  className="ll:whitespace-pre-wrap ll:select-text"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "normal",
                  }}
                >
                  {messageBody && (
                    <span
                      className={cn("ll:select-text", {
                        "ll:opacity-50": isMsgYesterday,
                      })}
                      style={{ color: messageBody.color }}
                    >
                      {messageBody.text}
                    </span>
                  )}
                </span>
              )}
            </ContextMenuTrigger>
          </TooltipTrigger>
          <TooltipContent className="ll:bg-black ll:p-2">
            <div className="ll:flex ll:items-center ll:gap-2">
              <CharacterTile
                character={message.characterData}
                className="ll:scale-75 ll:p-0"
              />
              <div className="ll:font-semibold ll:text-[11px]">
                {message.characterData.nick} ({message.characterData.lvl}
                {message.characterData.prof})
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        <ContextMenuContent className="ll:w-48 ll:flex ll:flex-col">
          {message.characterData.nick !== Game.hero.nick && (
            <ContextMenuItem
              onClick={() => {
                window.Engine.chatController
                  .getChatInputWrapper()
                  .setPrivateMessageProcedure(message.characterData.nick);
              }}
            >
              {t("contextMenu.sendMessage")}
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
          {Game.interface === "ni" && (
            <ContextMenuItem
              onClick={() => {
                window.Engine.showEqManager.update({
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
          {message.characterData.nick !== Game.hero.nick && (
            <ContextMenuItem
              onClick={() => {
                window._g(
                  "friends&a=finvite&nick=" +
                    message.characterData.nick.trim().split(" ").join("_"),
                );
              }}
            >
              {t("contextMenu.inviteFriends")}
            </ContextMenuItem>
          )}
          {message.characterData.nick !== Game.hero.nick && (
            <ContextMenuItem
              onClick={() => {
                window._g("party&a=inv&id=" + message.characterData.id);
              }}
            >
              {t("contextMenu.inviteParty")}
            </ContextMenuItem>
          )}
          {Game.interface === "ni" && (
            <ContextMenuItem
              onClick={() => {
                window.Engine.iframeWindowManager.newPlayerProfile({
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
    </div>
  );
};
