import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { ScrollBar } from "@/components/ui/scroll-bar";
import {
  MessageScroller,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@shadcn/react/message-scroller";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import type {
  ChatMessageResponseDtoOutput,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@lootlog/client/main";
import { EmptyState } from "@/components/empty-state";
import { ScrollToLatestButton } from "@/components/common/scroll-to-latest-button";
import type { useChatGuildData } from "../hooks/use-chat-guild-data";
import {
  getViewportPosition,
  useTranscriptFollow,
} from "../hooks/use-transcript-follow";
import type { ChatRenderableMessage } from "../chat.helpers";
import { getChatDensityStyle } from "../chat-density";
import { subscribeToChatScrollToMessage } from "../chat-scroll-to-message";
import { ChatTranscriptRow } from "./chat-transcript-row";

export type ChatScrollPosition = {
  atEnd: boolean;
  messageId?: string;
  offset: number;
};

type ChatGuildData = ReturnType<typeof useChatGuildData>;

export type ChatTranscriptProps = {
  appearance?: ChatAppearanceSettings;
  npcTypeColors?: NpcTypeColors;
  ariaLabel: string;
  emptyStateTitle: string;
  emptyStateDescription?: string;
  guildNamesById: Record<string, string>;
  membersByGuildId: ChatGuildData["membersByGuildId"];
  mentionContextsByGuildId: ChatGuildData["mentionContextsByGuildId"];
  onReplyToMessage: (
    message: ChatMessageResponseDtoOutput,
    member?: GuildMember,
  ) => void;
  onDeleteMessage?: (message: ChatMessageResponseDtoOutput) => void;
  deletingMessageIds?: ReadonlySet<string>;
  renderables: ChatRenderableMessage[];
  selectedGuildId: string;
  isActive?: boolean;
  unreadIds?: ReadonlySet<string>;
  onMessagesSeen?: (ids: string[]) => void;
  position?: ChatScrollPosition;
  onPositionChange?: (position: ChatScrollPosition) => void;
};

const noopDeleteMessage = () => undefined;

export const ChatTranscript = ({
  appearance = CHAT_APPEARANCE_READABLE_PRESET,
  npcTypeColors,
  ariaLabel,
  emptyStateTitle,
  emptyStateDescription,
  guildNamesById,
  membersByGuildId,
  mentionContextsByGuildId,
  onReplyToMessage,
  onDeleteMessage = noopDeleteMessage,
  deletingMessageIds,
  renderables,
  selectedGuildId,
  isActive = true,
  unreadIds,
  onMessagesSeen,
  position,
  onPositionChange,
}: ChatTranscriptProps) => {
  const { t } = useTranslation("chat");
  const { scrollToMessage } = useMessageScroller();
  const { end } = useMessageScrollerScrollable();
  const { visibleMessageIds } = useMessageScrollerVisibility();
  const viewport = useRef<HTMLDivElement>(null);

  const { holdPosition, resumeAtEnd, resumeOnWheel } =
    useTranscriptFollow(viewport);

  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(highlightTimer.current), []);
  const initialPosition = useRef(position);
  const restored = useRef(false);
  const isEmpty = renderables.length === 0;

  const jump = useEffectEvent((messageId: string) => {
    const row = renderables.find(
      (item) =>
        item.kind !== "date-divider" &&
        (item.message.id === messageId ||
          (item.kind === "npc-group" && item.messageIds.includes(messageId))),
    );

    if (
      !row ||
      row.kind === "date-divider" ||
      !scrollToMessage(row.message.id, { align: "center", behavior: "instant" })
    ) {
      return false;
    }

    clearTimeout(highlightTimer.current);
    setHighlightedMessageId(row.message.id);
    highlightTimer.current = setTimeout(
      () => setHighlightedMessageId(null),
      1500,
    );

    return true;
  });

  const observeVisible = useEffectEvent(() => {
    if (
      !restored.current ||
      !isActive ||
      document.visibilityState === "hidden" ||
      !viewport.current
    )
      return;
    const box = viewport.current.getBoundingClientRect();

    if (box.height === 0 || box.width === 0) return;

    const visible = new Set(
      Array.from(
        viewport.current.querySelectorAll<HTMLElement>("[data-message-id]"),
      ).flatMap((element) => {
        const row = element.getBoundingClientRect();

        return row.bottom > box.top && row.top < box.bottom
          ? [element.dataset.messageId]
          : [];
      }),
    );

    const ids = renderables.flatMap((row) => {
      if (row.kind === "date-divider" || !visible.has(row.message.id))
        return [];

      return row.kind === "npc-group" ? row.messageIds : [row.message.id];
    });

    if (ids.length > 0) onMessagesSeen?.(ids);
  });

  useEffect(() => {
    observeVisible();
    document.addEventListener("visibilitychange", observeVisible);

    return () =>
      document.removeEventListener("visibilitychange", observeVisible);
  }, [isActive, visibleMessageIds, unreadIds]);

  useLayoutEffect(() => {
    if (isEmpty || restored.current) return;

    const frame = requestAnimationFrame(() => {
      restored.current = true;
      const saved = initialPosition.current;

      if (saved?.atEnd === false && saved.messageId) {
        scrollToMessage(saved.messageId, {
          align: "start",
          scrollMargin: saved.offset,
          behavior: "instant",
        });
      }

      observeVisible();
    });

    return () => cancelAnimationFrame(frame);
  }, [isEmpty, scrollToMessage]);

  const savePosition = () => {
    if (!restored.current || !isActive || !viewport.current) return;
    onPositionChange?.(getViewportPosition(viewport.current));
  };

  const savePositionFromEffect = useEffectEvent(savePosition);
  // Persist actual DOM scroll geometry after virtualized rows change; the parent does not own this viewport.
  useEffect(() => {
    savePositionFromEffect();
  }, [end, visibleMessageIds, isActive]);

  useEffect(
    () =>
      subscribeToChatScrollToMessage((event) => {
        if (isActive) jump(event.detail.messageId);
      }),
    [isActive],
  );

  return (
    <BaseScrollArea.Root
      render=<MessageScroller.Root />
      className="ll:relative ll:flex ll:size-full ll:min-h-0 ll:flex-col ll:overflow-hidden"
    >
      {isEmpty ? (
        <EmptyState
          description={emptyStateDescription}
          title={emptyStateTitle}
        />
      ) : null}
      <BaseScrollArea.Viewport
        render=<MessageScroller.Viewport />
        ref={viewport}
        aria-label={ariaLabel}
        hidden={isEmpty}
        data-chat-viewport
        data-scroll-fade-viewport
        data-ll-draggable="false"
        className="ll:scroll-fade-y ll:scroll-fade-4 ll:size-full ll:min-h-0 ll:overflow-y-auto ll:overscroll-contain ll:rounded ll:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-inset ll:focus-visible:ring-ring"
        style={{ overflowAnchor: "auto", overflowX: "hidden" }}
        onPointerDown={holdPosition}
        onScroll={() => {
          resumeAtEnd();
          savePosition();
        }}
        onWheel={resumeOnWheel}
      >
        <BaseScrollArea.Content
          render=<MessageScroller.Content />
          role="list"
          aria-live="off"
          className="ll-chat-message-list ll:flex ll:h-max ll:min-h-full ll:w-full ll:min-w-0 ll:flex-col"
          style={getChatDensityStyle(appearance.fontScalePercent)}
        >
          {renderables.map((row) => {
            const message = row.kind === "date-divider" ? null : row.message;

            return (
              <ChatTranscriptRow
                key={row.key}
                row={row}
                highlighted={
                  isActive &&
                  message !== null &&
                  message.id === highlightedMessageId
                }
                appearance={appearance}
                npcTypeColors={npcTypeColors}
                all={selectedGuildId === "all"}
                guildName={
                  message ? guildNamesById[message.guildId] : undefined
                }
                member={
                  message
                    ? membersByGuildId[message.guildId]?.[message.senderId]
                    : undefined
                }
                mentionContext={
                  message
                    ? mentionContextsByGuildId[message.guildId]
                    : undefined
                }
                isDeleting={
                  message
                    ? (deletingMessageIds?.has(message.id) ?? false)
                    : false
                }
                onReplyToMessage={onReplyToMessage}
                onDeleteMessage={onDeleteMessage}
              />
            );
          })}
        </BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <ScrollToLatestButton label={t("navigation.latest")} />
    </BaseScrollArea.Root>
  );
};
