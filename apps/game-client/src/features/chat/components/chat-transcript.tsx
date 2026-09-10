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
  type PointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, MessageCircle } from "lucide-react";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import type { ChatMessageResponseDtoOutput } from "@lootlog/client/main";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { useChatGuildData } from "../hooks/use-chat-guild-data";
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
  guildNamesById: Record<string, string>;
  membersByGuildId: ChatGuildData["membersByGuildId"];
  mentionContextsByGuildId: ChatGuildData["mentionContextsByGuildId"];
  onReplyToMessage: (message: ChatMessageResponseDtoOutput) => void;
  renderables: ChatRenderableMessage[];
  selectedGuildId: string;
  isActive?: boolean;
  unreadIds?: ReadonlySet<string>;
  onMessagesSeen?: (ids: string[]) => void;
  position?: ChatScrollPosition;
  onPositionChange?: (position: ChatScrollPosition) => void;
};

const getViewportPosition = (viewport: HTMLElement): ChatScrollPosition => {
  const box = viewport.getBoundingClientRect();

  const row = Array.from(
    viewport.querySelectorAll<HTMLElement>("[data-message-id]"),
  ).find((element) => element.getBoundingClientRect().bottom > box.top);

  return {
    atEnd:
      viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 1,
    messageId: row?.dataset.messageId,
    offset: row ? row.getBoundingClientRect().top - box.top : 0,
  };
};

export const ChatTranscript = ({
  appearance = CHAT_APPEARANCE_READABLE_PRESET,
  npcTypeColors,
  ariaLabel,
  emptyStateTitle,
  guildNamesById,
  membersByGuildId,
  mentionContextsByGuildId,
  onReplyToMessage,
  renderables,
  selectedGuildId,
  isActive = true,
  unreadIds,
  onMessagesSeen,
  position,
  onPositionChange,
}: ChatTranscriptProps) => {
  const { t } = useTranslation("chat");
  const { scrollToMessage, scrollToEnd } = useMessageScroller();
  const { end } = useMessageScrollerScrollable();
  const { visibleMessageIds } = useMessageScrollerVisibility();
  const viewport = useRef<HTMLDivElement>(null);
  const pointerHeld = useRef(false);

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
  // oxlint-disable-next-line react-doctor/no-pass-data-to-parent
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

  const holdPosition = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("button, a, input, textarea, [contenteditable=true]")
    )
      return;
    const element = viewport.current;

    if (!element) return;
    const position = getViewportPosition(element);
    pointerHeld.current = true;

    if (position.messageId)
      scrollToMessage(position.messageId, {
        align: "start",
        scrollMargin: position.offset,
        behavior: "instant",
      });
  };

  const resumeAtEnd = () => {
    const element = viewport.current;

    if (
      element &&
      !pointerHeld.current &&
      !window.getSelection()?.toString() &&
      element.scrollHeight - element.clientHeight - element.scrollTop <= 1
    ) {
      scrollToEnd({ behavior: "instant" });
    }
  };

  const releasePosition = useEffectEvent(() => {
    if (!pointerHeld.current) return;
    pointerHeld.current = false;
    resumeAtEnd();
  });

  useEffect(() => {
    window.addEventListener("pointerup", releasePosition);
    window.addEventListener("pointercancel", releasePosition);

    return () => {
      window.removeEventListener("pointerup", releasePosition);
      window.removeEventListener("pointercancel", releasePosition);
    };
  }, []);

  return (
    <BaseScrollArea.Root
      render=<MessageScroller.Root />
      className="ll:relative ll:flex ll:size-full ll:min-h-0 ll:flex-col ll:overflow-hidden"
    >
      {isEmpty ? (
        <EmptyState icon={MessageCircle} title={emptyStateTitle} />
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
        onWheel={(event) => {
          if (event.deltaY > 0) resumeAtEnd();
        }}
      >
        <BaseScrollArea.Content
          render=<MessageScroller.Content />
          role="list"
          aria-live="off"
          className="ll-chat-message-list ll:flex ll:h-max ll:min-h-full ll:w-full ll:min-w-0 ll:flex-col"
          style={getChatDensityStyle(appearance.fontScalePercent)}
        >
          {renderables.map((row) => (
            <ChatTranscriptRow
              key={row.key}
              row={row}
              highlighted={
                isActive &&
                row.kind !== "date-divider" &&
                row.message.id === highlightedMessageId
              }
              appearance={appearance}
              npcTypeColors={npcTypeColors}
              selectedGuildId={selectedGuildId}
              guildNamesById={guildNamesById}
              membersByGuildId={membersByGuildId}
              mentionContextsByGuildId={mentionContextsByGuildId}
              onReplyToMessage={onReplyToMessage}
            />
          ))}
        </BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <Button
        hidden={!end}
        style={{ display: end ? undefined : "none" }}
        onClick={() => scrollToEnd({ behavior: "instant" })}
        aria-label={t("navigation.latest")}
        className="ll:absolute ll:bottom-2 ll:left-1/2 ll:-translate-x-1/2 ll:size-7 ll:p-0 ll:shadow-md ll:bg-gray-800/90 ll:hover:bg-gray-700/95"
      >
        <ArrowDown aria-hidden className="ll:size-3" />
      </Button>
    </BaseScrollArea.Root>
  );
};
