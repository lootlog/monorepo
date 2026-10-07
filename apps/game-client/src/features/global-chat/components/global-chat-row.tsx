import { MessageScroller } from "@shadcn/react/message-scroller";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import {
  ContextMenu,
  ContextMenuTrigger,
  openContextMenuOnKeyDown,
} from "@/components/ui/context-menu";
import { toWorldOption } from "@/components/world-combobox";
import { ChatDateDivider } from "@/features/chat/components/chat-date-divider";
import { ChatPlayerMessageView } from "@/features/chat/components/chat-player-message-view";
import { isChatMessageYesterdayOrOlder } from "@/features/chat/components/chat-message.helpers";
import type { GlobalChatChannel } from "@/store/global-chat.store";
import {
  getGlobalChatColor,
  getGlobalChatSenderColor,
  type GlobalChatRow as GlobalChatRowData,
} from "../global-chat.helpers";
import { GlobalChatMessageMenu } from "./global-chat-message-menu";

/** What every row of one channel shares. */
export type GlobalChatRowContext = {
  channel: GlobalChatChannel;
  canModerate: boolean;
  /** The shared channel tags each message with the world it was sent from. */
  showOriginWorld: boolean;
};

type GlobalChatRowProps = {
  appearance: ChatAppearanceSettings;
  context: GlobalChatRowContext;
  row: GlobalChatRowData;
};

// A divider's label depends only on its day, which its key names.
const areRowPropsEqual = (
  previous: GlobalChatRowProps,
  next: GlobalChatRowProps,
) =>
  previous.appearance === next.appearance &&
  previous.context.channel === next.context.channel &&
  previous.context.canModerate === next.context.canModerate &&
  previous.context.showOriginWorld === next.context.showOriginWorld &&
  previous.row.key === next.row.key &&
  (previous.row.kind === "message"
    ? next.row.kind === "message" && previous.row.message === next.row.message
    : next.row.kind === "date-divider");

/**
 * Memoized like ChatTranscriptRow, where every incoming message re-rendered
 * every row (measured 502 row renders per message without it). Rows are
 * rebuilt per render, but their message objects keep their identity across
 * live appends. The action menu mounts only while open.
 */
export const GlobalChatRow = memo(function GlobalChatRow({
  appearance,
  context,
  row,
}: GlobalChatRowProps) {
  const { t } = useTranslation("globalChat");
  const [menuOpen, setMenuOpen] = useState(false);
  const messageGap = appearance.messageGapPx;

  if (row.kind === "date-divider") {
    return (
      <MessageScroller.Item
        role="listitem"
        style={{
          paddingBlockStart: messageGap / 2,
          paddingBlockEnd: messageGap / 2,
        }}
        className="ll:min-w-0 ll:shrink-0 ll:pl-1.5 ll:pr-0.5 ll:odd:bg-white/5 ll:even:bg-black/25"
      >
        <ChatDateDivider timestamp={row.timestamp} />
      </MessageScroller.Item>
    );
  }

  const { message } = row;
  const isMsgYesterday = isChatMessageYesterdayOrOlder(message.timestamp);
  const originWorld = context.showOriginWorld ? message.originWorld : undefined;

  return (
    <MessageScroller.Item
      messageId={message.id}
      role="listitem"
      style={{
        paddingBlockStart: messageGap / 2,
        paddingBlockEnd: messageGap / 2,
      }}
      className="ll:min-w-0 ll:shrink-0 ll:pl-1.5 ll:pr-0.5 ll:odd:bg-white/5 ll:even:bg-black/25 ll:odd:hover:bg-white/10 ll:even:hover:bg-white/10"
    >
      <ContextMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <ContextMenuTrigger
          asChild
          tabIndex={0}
          onKeyDown={openContextMenuOnKeyDown}
        >
          <ChatPlayerMessageView
            all={false}
            appearance={appearance}
            guildName=""
            isMsgYesterday={isMsgYesterday}
            messageId={message.id}
            timestamp={message.timestamp}
            sender={
              <>
                {originWorld ? (
                  <span
                    className="ll:mr-1 ll:text-[0.85em] ll:font-semibold"
                    style={{ color: getGlobalChatColor(originWorld) }}
                    title={t("message.originWorld", {
                      world: toWorldOption(originWorld).label,
                    })}
                  >
                    {toWorldOption(originWorld).label}
                  </span>
                ) : null}
                {message.isAdmin ? (
                  <span className="ll:sr-only">{t("message.admin")}</span>
                ) : null}
                <span
                  // Underlines the caller's own name; the narrow window has no
                  // room for a box. An admin's name already stands out in red.
                  className={cn("ll:font-bold ll:mr-0.5", {
                    "ll:underline ll:underline-offset-2":
                      message.isOwn && !message.isAdmin,
                  })}
                  style={{ color: getGlobalChatSenderColor(message) }}
                >
                  {message.displayName}:
                </span>
              </>
            }
            body={
              <span
                data-slot="bubble"
                className={cn("ll:whitespace-pre-wrap ll:select-text", {
                  "ll:text-gray-200": isMsgYesterday,
                })}
                style={{ overflowWrap: "anywhere", wordBreak: "normal" }}
              >
                {message.message}
              </span>
            }
          />
        </ContextMenuTrigger>
        {menuOpen ? (
          <GlobalChatMessageMenu
            channel={context.channel}
            message={message}
            canModerate={context.canModerate}
          />
        ) : null}
      </ContextMenu>
    </MessageScroller.Item>
  );
}, areRowPropsEqual);
