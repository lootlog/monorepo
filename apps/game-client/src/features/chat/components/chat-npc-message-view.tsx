import { NpcTile } from "@/components/npc-tile";
import { cn } from "@/lib/utils";
import { format } from "@/utils/local-date";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { GameNpc } from "@lootlog/margonem/npcs";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
  type NpcTypeColors,
} from "@lootlog/types";
import type { FC, ReactElement, ReactNode } from "react";
import {
  getChatNpcCoordinatesLabel,
  getChatNpcLocationName,
  getChatNpcTextColor,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";
import { ChatNpcCountBadge } from "./chat-npc-count-badge";

type ChatNpcMessageViewProps = {
  all: boolean;
  appearance?: ChatAppearanceSettings;
  count?: number;
  guildName: string;
  memberColor: string;
  message: ChatMessageType;
  npcTypeColors?: NpcTypeColors;
  senderName: string;
  wrapSender?: (sender: ReactElement) => ReactNode;
};

export const ChatNpcMessageView: FC<ChatNpcMessageViewProps> = ({
  all,
  appearance = CHAT_APPEARANCE_READABLE_PRESET,
  count = 1,
  guildName,
  memberColor,
  message,
  npcTypeColors,
  senderName,
  wrapSender,
}) => {
  const npc = message.npc;
  if (!npc) return null;

  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);
  const npcLocationName = getChatNpcLocationName(npc);
  const npcCoordinatesLabel = getChatNpcCoordinatesLabel(npc);
  const npcTextColor = getChatNpcTextColor(npc, npcTypeColors);
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
  const sender = (
    <span
      className={cn("ll:select-text ll:font-bold", {
        "ll:text-gray-100": isMsgYesterday,
      })}
      style={{ color: `#${memberColor}` }}
    >
      {senderName}:
    </span>
  );

  return (
    <div
      className="ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:cursor-text ll:select-text ll:rounded-sm ll:text-[length:var(--ll-chat-font-size)] ll:leading-[var(--ll-chat-line-height)] ll:text-white ll:transition-colors ll:hover:bg-gray-500/20"
      data-chat-message-id={message.id}
    >
      <div
        className="ll:mb-[var(--ll-chat-space-xs)] ll:min-w-0 ll:max-w-full"
        style={{ overflowWrap: "anywhere" }}
      >
        {appearance.showTimestamp ? (
          <span
            className={cn(
              "ll:select-text ll:text-[length:var(--ll-chat-meta-font-size)] ll:leading-[var(--ll-chat-meta-line-height)]",
              { "ll:opacity-50": isMsgYesterday },
            )}
          >
            [{format(new Date(message.timestamp), "HH:mm")}]
          </span>
        ) : null}{" "}
        {all && appearance.showGuildLabel ? (
          <span
            className={cn("ll:mr-0.5 ll:select-text ll:font-bold", {
              "ll:opacity-50": isMsgYesterday,
            })}
          >
            [{guildName}]{" "}
          </span>
        ) : null}
        {wrapSender ? wrapSender(sender) : sender}{" "}
      </div>
      <div
        className={cn(
          "ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:items-center ll:gap-[var(--ll-chat-space-sm)] ll:overflow-hidden ll:rounded-sm ll:px-[var(--ll-chat-space-md)] ll:py-[var(--ll-chat-space-sm)]",
          appearance.npcLayout === "tile"
            ? "ll:bg-gray-500/25 ll:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "ll:bg-transparent ll:px-[var(--ll-chat-space-xs)] ll:py-0",
        )}
      >
        {appearance.showNpcAvatar ? (
          <NpcTile
            className="ll:h-auto ll:max-h-[var(--ll-chat-avatar-height)] ll:w-auto ll:max-w-[var(--ll-chat-avatar-width)] ll:rounded ll:object-contain"
            containerClassName="ll:h-[var(--ll-chat-avatar-height)] ll:w-[var(--ll-chat-avatar-width)] ll:shrink-0 ll:items-center"
            npc={tileNpc}
          />
        ) : null}

        <div
          className={cn(
            "ll:flex ll:min-w-0 ll:max-w-full ll:flex-1 ll:flex-col ll:overflow-hidden ll:leading-tight",
            appearance.npcLayout === "inline" &&
              "ll:flex-row ll:flex-wrap ll:items-baseline ll:gap-x-[var(--ll-chat-space-sm)] ll:overflow-visible",
          )}
        >
          <div className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:items-baseline ll:gap-[var(--ll-chat-space-sm)] ll:overflow-hidden">
            <div className="ll:flex ll:min-w-0 ll:flex-1 ll:items-baseline ll:gap-[var(--ll-chat-space-sm)] ll:overflow-hidden">
              <span
                className={cn(
                  "ll:min-w-0 ll:max-w-full ll:truncate ll:text-[length:var(--ll-chat-meta-font-size)] ll:leading-[var(--ll-chat-meta-line-height)] ll:font-semibold",
                  { "ll:text-gray-100": isMsgYesterday },
                )}
                style={{ color: npcTextColor }}
              >
                {npc.name}
              </span>
              {appearance.showNpcLevel ? (
                <span
                  className={cn(
                    "ll:shrink-0 ll:select-text ll:text-[length:var(--ll-chat-detail-font-size)] ll:leading-[var(--ll-chat-detail-line-height)] ll:text-gray-300",
                    { "ll:text-gray-300": isMsgYesterday },
                  )}
                >
                  ({npc.lvl}
                  {npc.prof})
                </span>
              ) : null}
            </div>
            <ChatNpcCountBadge count={count} />
          </div>

          {appearance.showNpcLocationAndCoordinates &&
          (npcLocationName || npcCoordinatesLabel) ? (
            <div
              className={cn(
                "ll:w-full ll:min-w-0 ll:max-w-full ll:select-text ll:whitespace-normal ll:break-words ll:text-[length:var(--ll-chat-detail-font-size)] ll:leading-[var(--ll-chat-detail-line-height)] ll:text-gray-400",
                appearance.npcLayout === "inline" && "ll:w-auto ll:flex-none",
                { "ll:text-gray-400": isMsgYesterday },
              )}
            >
              {npcLocationName ? <span>{npcLocationName}</span> : null}
              {npcCoordinatesLabel ? (
                <>
                  {npcLocationName ? " " : null}
                  <span className="ll:whitespace-nowrap">
                    {npcCoordinatesLabel}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
