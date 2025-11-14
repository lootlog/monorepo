import { NPC_NAMES } from "@/constants/margonem";
import type { ChatMessage as ChatMessageType } from "@/hooks/api/use-chat-messages";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { cn } from "@/lib/utils";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { format, isYesterday } from "date-fns";
import type { FC } from "react";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import { MessageType } from "@/hooks/api/use-send-chat-message";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { NPCS_WITH_LOCATION } from "@/features/npc-detector/components/npc-list-item";
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
import { Game } from "@/lib/game";
import { useGuilds } from "@/hooks/api/use-guilds";
import { CharacterTile } from "@/components/character-tile";

export type ChatMessageProps = {
  all: boolean;
  message: ChatMessageType;
  member?: GuildMember;
};

export const ChatMessage: FC<ChatMessageProps> = ({ all, message, member }) => {
  const { data: guilds } = useGuilds();
  const memberColor = useMemberColor(member);
  const msgDate = new Date(message.timestamp);
  const now = new Date();
  const isMsgYesterdayOrOlder =
    msgDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isMsgYesterday = isYesterday(msgDate) || isMsgYesterdayOrOlder;

  const renderChatMessage = (message: ChatMessageType) => {
    if (message.type === MessageType.NPC) {
      const npc = message.npc;
      if (!npc) return null;
      const npcType = getNpcTypeByWt(npc.wt, npc.prof, npc.type);

      const shortname = NPC_NAMES[npcType]?.shortname;
      const color = getTextColor(npcType, true);

      let location = npc.location;

      if (NPCS_WITH_LOCATION.includes(npcType)) {
        location = `${location} (${npc.x}, ${npc.y})`;
      }

      return (
        <span
          style={{ color }}
          className={cn("ll:select-text", { "ll:opacity-50": isMsgYesterday })}
        >
          [{shortname}] {npc.name} ({npc.lvl}
          {npc.prof ?? ""}) {location ? `- ${location}` : ""}
        </span>
      );
    }

    if (message.type === MessageType.NOTIFICATION) {
      const color = getTextColor("message", true);
      return (
        <span
          className={cn("ll:select-text", { "ll:opacity-50": isMsgYesterday })}
          style={{ color }}
        >
          [P] {message.message}
        </span>
      );
    }

    return (
      <span
        className={cn("ll:select-text", { "ll:opacity-50": isMsgYesterday })}
      >
        {message.message}
      </span>
    );
  };

  if (!message.characterData) return null;

  if (!member?.name) return null;

  const guild = guilds?.find((g) => g.id === message.guildId);
  if (!guild) return null;

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
                    [{guild.name}]{" "}
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
                {renderChatMessage(message)}
              </span>
            </ContextMenuTrigger>
          </TooltipTrigger>
          <TooltipContent className="ll:bg-black ll:p-0 ll:px-2 ll:flex ll:items-center ll:gap-2">
            <CharacterTile
              character={message.characterData}
              className="ll:scale-75 ll:p-0"
            />
            <div className="ll:font-semibold">
              {message.characterData.nick} ({message.characterData.lvl}
              {message.characterData.prof})
            </div>
          </TooltipContent>
        </Tooltip>

        <ContextMenuContent className="ll-w-48 ll-flex ll-flex-col">
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
