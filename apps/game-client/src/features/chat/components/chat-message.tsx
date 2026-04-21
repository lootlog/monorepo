import { useMemberColor } from "@/hooks/discord/use-member-color";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { FC } from "react";
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
  const memberColor = useMemberColor(member);
  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);
  const messageBody = getChatMessageBody(message);

  if (!message.characterData) return null;

  if (!member?.name) return null;

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
                  {member?.name || "Nieznany"}:
                </span>
              </span>{" "}
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
              Wyślij wiadomość
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
              Pokaż ekwipunek
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
              Zaproś do przyjaciół
            </ContextMenuItem>
          )}
          {message.characterData.nick !== Game.hero.nick && (
            <ContextMenuItem
              onClick={() => {
                window._g("party&a=inv&id=" + message.characterData.id);
              }}
            >
              Zaproś do drużyny
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
              Pokaż profil
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};
