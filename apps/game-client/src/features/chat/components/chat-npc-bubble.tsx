import { Bubble } from "@/components/ui/bubble";
import { NpcTile } from "@/components/npc-tile";
import { cn } from "cn";
import type { ChatMessageResponseDtoOutputNpc as ChatNpc } from "@lootlog/client/main";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { FC } from "react";
import {
  getChatNpcCoordinatesLabel,
  getChatNpcLocationName,
  toChatGameNpc,
} from "./chat-message.helpers";
import { ChatNpcCountBadge } from "./chat-npc-count-badge";

type ChatNpcBubbleProps = {
  appearance: ChatAppearanceSettings;
  backgroundColor: string;
  count: number;
  isMsgYesterday: boolean;
  npc: ChatNpc;
  textColor: string;
};

export const ChatNpcBubble: FC<ChatNpcBubbleProps> = ({
  appearance,
  backgroundColor,
  count,
  isMsgYesterday,
  npc,
  textColor,
}) => {
  const npcLocationName = getChatNpcLocationName(npc);
  const npcCoordinatesLabel = getChatNpcCoordinatesLabel(npc);

  return (
    <Bubble
      className={cn(
        "ll:flex ll:-ml-1.5 ll:-mr-0.5 ll:w-[calc(100%+8px)] ll:min-w-0 ll:max-w-none ll:items-center ll:gap-[var(--ll-chat-space-sm)] ll:overflow-hidden ll:rounded-none ll:pl-1.5 ll:pr-0.5 ll:py-[var(--ll-chat-space-sm)]",
        appearance.npcLayout === "inline" && "ll:py-0",
      )}
      style={{ backgroundColor }}
    >
      {appearance.showNpcAvatar ? (
        <NpcTile
          className="ll:h-auto ll:max-h-[var(--ll-chat-avatar-height)] ll:w-auto ll:max-w-[var(--ll-chat-avatar-width)] ll:rounded ll:object-contain"
          containerClassName="ll:h-[var(--ll-chat-avatar-height)] ll:w-[var(--ll-chat-avatar-width)] ll:shrink-0 ll:items-center"
          npc={toChatGameNpc(npc)}
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
              style={{ color: textColor }}
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
  );
};
