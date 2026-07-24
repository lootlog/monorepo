import { NpcTile } from "@/components/npc-tile";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { MemberSummaryResponseDtoOutput as GuildMember } from "@lootlog/api-client/models/main/member-summary-response-dto-output";
import { cn } from "@/lib/utils";
import { format } from "@/utils/local-date";
import type { FC } from "react";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { ChatAppearanceSettings } from "@lootlog/types";
import {
  getChatNpcCoordinatesLabel,
  getChatNpcLocationName,
  getChatNpcTextColor,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";
import { ChatCharacterTooltip } from "./chat-character-tooltip";

type ChatNpcMessageProps = {
  additionalSenderCount?: number;
  all: boolean;
  appearance?: ChatAppearanceSettings;
  count?: number;
  guildName?: string;
  member?: GuildMember;
  message: ChatMessageType;
};

const DEFAULT_CHAT_APPEARANCE: ChatAppearanceSettings = {
  npcLayout: "tile",
  fontScalePercent: 100,
  messageGapPx: 4,
  showTimestamp: true,
  showGuildLabel: true,
  showNpcAvatar: true,
  showNpcLevel: true,
  showNpcLocation: true,
  showNpcCoordinates: true,
};

export const ChatNpcMessage: FC<ChatNpcMessageProps> = ({
  additionalSenderCount = 0,
  all,
  appearance = DEFAULT_CHAT_APPEARANCE,
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
        {appearance.showTimestamp ? (
          <span
            className={cn("ll:text-[11px] ll:select-text", {
              "ll:opacity-50": isMsgYesterday,
            })}
          >
            [{format(new Date(message.timestamp), "HH:mm")}]
          </span>
        ) : null}{" "}
        {all && appearance.showGuildLabel && (
          <span
            className={cn("ll:font-bold ll:mr-0.5 ll:select-text", {
              "ll:opacity-50": isMsgYesterday,
            })}
          >
            [{guildName}]{" "}
          </span>
        )}
        <ChatCharacterTooltip character={message.characterData}>
          <span
            className={cn("ll:font-bold ll:select-text", {
              "ll:text-gray-100": isMsgYesterday,
            })}
            style={{ color: `#${memberColor}` }}
          >
            {senderName}:
          </span>
        </ChatCharacterTooltip>{" "}
        {count > 1 && (
          <span className="ll:ml-1 ll:inline-flex ll:rounded-full ll:bg-red-600 ll:px-1.5 ll:py-px ll:text-[10px] ll:font-bold ll:leading-none ll:text-white">
            x{count}
          </span>
        )}
      </div>
      <div
        className={cn(
          "ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:items-center ll:gap-1 ll:overflow-hidden ll:rounded-sm ll:px-1.5 ll:py-1",
          appearance.npcLayout === "tile"
            ? "ll:bg-gray-500/25 ll:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "ll:bg-transparent ll:px-0.5 ll:py-0",
        )}
      >
        {appearance.showNpcAvatar ? (
          <NpcTile
            npc={tileNpc}
            className="ll:h-auto ll:max-h-7 ll:w-auto ll:max-w-6 ll:object-contain ll:rounded"
            containerClassName="ll:h-7 ll:w-6 ll:shrink-0 ll:items-center"
          />
        ) : null}

        <div
          className={cn(
            "ll:flex ll:min-w-0 ll:max-w-full ll:flex-1 ll:flex-col ll:overflow-hidden ll:leading-tight",
            appearance.npcLayout === "inline" &&
              "ll:flex-row ll:flex-wrap ll:items-baseline ll:gap-x-1 ll:overflow-visible",
          )}
        >
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
              {appearance.showNpcLevel ? (
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
              ) : null}
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

          {((appearance.showNpcLocation && npcLocationName) ||
            (appearance.showNpcCoordinates && npcCoordinatesLabel)) && (
            <div
              className={cn(
                "ll:w-full ll:min-w-0 ll:max-w-full ll:whitespace-normal ll:break-words ll:text-[10px] ll:text-gray-400 ll:select-text",
                appearance.npcLayout === "inline" && "ll:w-auto ll:flex-none",
                {
                  "ll:text-gray-400": isMsgYesterday,
                },
              )}
            >
              {appearance.showNpcLocation && npcLocationName ? (
                <span>{npcLocationName}</span>
              ) : null}
              {appearance.showNpcCoordinates && npcCoordinatesLabel && (
                <>
                  {appearance.showNpcLocation && npcLocationName ? " " : null}
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
