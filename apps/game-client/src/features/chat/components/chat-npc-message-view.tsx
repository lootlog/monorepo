import { getSubtleBackgroundColor } from "@/utils/notifications-and-detector/background";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import { NpcType } from "@/api/npcs.api";
import { Message } from "@/components/ui/message";
import { Bubble } from "@/components/ui/bubble";
import { NpcTile } from "@/components/npc-tile";
import { cn } from "cn";
import { format } from "@/utils/local-date";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import type { FC, ReactElement, ReactNode } from "react";
import {
  toChatGameNpc,
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

export const ChatNpcMessageView: FC<ChatNpcMessageViewProps> = (props) => {
  const {
    all,
    guildName,
    memberColor,
    message,
    npcTypeColors,
    senderName,
    wrapSender,
  } = props;

  const appearance = props.appearance ?? CHAT_APPEARANCE_READABLE_PRESET;
  const count = props.count ?? 1;
  const npc = message.npc;

  if (!npc) return null;

  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);
  const npcLocationName = getChatNpcLocationName(npc);
  const npcCoordinatesLabel = getChatNpcCoordinatesLabel(npc);
  const npcTextColor = getChatNpcTextColor(npc, npcTypeColors);
  const tileNpc = toChatGameNpc(npc);

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
    <Message
      className="ll:cursor-text ll:select-text"
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
      <Bubble
        className={cn(
          "ll:flex ll:-ml-1.5 ll:-mr-0.5 ll:w-[calc(100%+8px)] ll:min-w-0 ll:max-w-none ll:box-border ll:items-center ll:gap-[var(--ll-chat-space-sm)] ll:overflow-hidden ll:rounded-none ll:pl-1.5 ll:pr-0.5 ll:py-[var(--ll-chat-space-sm)]",
          appearance.npcLayout === "inline" && "ll:py-0",
        )}
        style={{
          backgroundColor: getSubtleBackgroundColor(
            getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type),
            npcTypeColors,
          ),
        }}
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
            "ll:flex ll:min-w-0 ll:max-w-full ll:flex-1 ll:flex-col ll:leading-tight",
            appearance.npcLayout === "inline" &&
              "ll:flex-row ll:flex-wrap ll:items-baseline ll:gap-x-[var(--ll-chat-space-sm)]",
          )}
        >
          <div className="ll:flex ll:w-full ll:min-w-0 ll:max-w-full ll:items-baseline ll:gap-[var(--ll-chat-space-sm)]">
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
      </Bubble>
    </Message>
  );
};
