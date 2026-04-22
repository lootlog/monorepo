import { NpcTile } from "@/components/npc-tile";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@/lib/api/generated/main/model";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { FC } from "react";
import type { GameNpc } from "@lootlog/margonem";
import {
  getChatNpcCoordinatesLabel,
  getChatNpcLocationName,
  getChatNpcTextColor,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";

type ChatNpcMessageProps = {
  additionalSenderCount?: number;
  all: boolean;
  count?: number;
  guildName?: string;
  member?: GuildMember;
  message: ChatMessageType;
};

export const ChatNpcMessage: FC<ChatNpcMessageProps> = ({
  additionalSenderCount = 0,
  all,
  count = 1,
  guildName,
  member,
  message,
}) => {
  const npc = message.npc;
  const memberColor = useMemberColor(member);

  if (!npc || !guildName) {
    return null;
  }

  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);
  const npcLocationName = getChatNpcLocationName(npc);
  const npcCoordinatesLabel = getChatNpcCoordinatesLabel(npc);
  const npcTextColor = getChatNpcTextColor(npc);

  const senderName = member?.name ?? message.characterData.nick;
  const tileNpc: GameNpc = {
    actions: 0,
    icon: npc.icon,
    id: npc.id,
    lvl: npc.lvl,
    nick: npc.name,
    prof: npc.prof,
    tpl: npc.id,
    type: npc.type,
    wt: npc.wt,
    x: npc.x ?? 0,
    y: npc.y ?? 0,
  };

  return (
    <div
      data-chat-message-id={message.id}
      className="ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:text-white ll:text-xs ll:select-text ll:cursor-text ll:rounded-sm ll:transition-colors ll:hover:bg-gray-500/20"
    >
      <div
        className="ll:mb-0.5 ll:min-w-0 ll:max-w-full"
        style={{ overflowWrap: "anywhere" }}
      >
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
          className={cn("ll:font-bold ll:select-text", {
            "ll:text-gray-100": isMsgYesterday,
          })}
          style={{ color: `#${memberColor}` }}
        >
          {senderName}:
        </span>{" "}
        {count > 1 && (
          <span className="ll:ml-1 ll:inline-flex ll:rounded-full ll:bg-red-600 ll:px-1.5 ll:py-px ll:text-[10px] ll:font-bold ll:leading-none ll:text-white">
            x{count}
          </span>
        )}
      </div>
      <div
        className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:items-center ll:gap-1 ll:overflow-hidden ll:rounded-sm ll:border-l-2 ll:bg-gray-500/30 ll:px-1.5 ll:py-1"
        style={{ borderColor: npcTextColor }}
      >
        <NpcTile
          npc={tileNpc}
          className="ll:h-auto ll:max-h-7 ll:w-auto ll:max-w-6 ll:object-contain ll:rounded"
          containerClassName="ll:h-7 ll:w-6 ll:shrink-0 ll:items-center"
        />

        <div className="ll:flex ll:min-w-0 ll:max-w-full ll:flex-1 ll:flex-col ll:overflow-hidden ll:leading-tight">
          <div className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:items-baseline ll:gap-1 ll:overflow-hidden">
            <div className="ll:flex ll:min-w-0 ll:flex-1 ll:items-baseline ll:gap-1 ll:overflow-hidden">
              <span
                className={cn(
                  "ll:min-w-0 ll:max-w-full ll:truncate ll:font-semibold ll:text-[11px]",
                  {
                    "ll:text-gray-100": isMsgYesterday,
                  },
                )}
                style={{ color: npcTextColor }}
              >
                {npc.name}
              </span>
              <span
                className={cn(
                  "ll:shrink-0 ll:text-[10px] ll:text-gray-300 ll:select-text",
                  {
                    "ll:text-gray-300": isMsgYesterday,
                  },
                )}
              >
                ({npc.lvl}
                {npc.prof})
              </span>
            </div>
            {additionalSenderCount > 0 && (
              <span
                className={cn(
                  "ll:shrink-0 ll:rounded-full ll:bg-gray-700/80 ll:px-1 ll:py-px ll:text-[9px] ll:font-semibold ll:leading-none ll:text-gray-200",
                  {
                    "ll:opacity-50": isMsgYesterday,
                  },
                )}
              >
                +{additionalSenderCount}
              </span>
            )}
          </div>

          {npcLocationName && (
            <div
              className={cn(
                "ll:w-full ll:min-w-0 ll:max-w-full ll:whitespace-normal ll:break-words ll:text-[10px] ll:text-gray-400 ll:select-text",
                {
                  "ll:text-gray-400": isMsgYesterday,
                },
              )}
            >
              <span>{npcLocationName}</span>
              {npcCoordinatesLabel && (
                <>
                  {" "}
                  <span className="ll:whitespace-nowrap">
                    {npcCoordinatesLabel}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
