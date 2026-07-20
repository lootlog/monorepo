import { MessageType } from "@/api/chat.api";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { useChatGuildData } from "@/features/chat/hooks/use-chat-guild-data";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@/lib/api/generated/main/model";
import { subscribeToChatScrollToMessage } from "../chat-scroll-to-message";
import type { ChatRenderableMessage } from "../chat.helpers";
import { ChatDateDivider } from "./chat-date-divider";
import { ChatMessage } from "./chat-message";
import { ChatNpcMessage } from "./chat-npc-message";
import { useEffect, useLayoutEffect, useRef, useState, type FC } from "react";

const CHAT_AUTOSCROLL_THRESHOLD_PX = 100;
const CHAT_LIST_FALLBACK_HEIGHT_PX = 320;
const CHAT_LIST_GAP_PX = 4;
const CHAT_LIST_OVERSCAN_PX = 160;

type ChatGuildData = ReturnType<typeof useChatGuildData>;

type ChatMessageListProps = {
  ariaLabel: string;
  emptyStateLabel: string;
  guildNamesById: Record<string, string>;
  hasRenderableMessages: boolean;
  membersByGuildId: ChatGuildData["membersByGuildId"];
  mentionContextsByGuildId: ChatGuildData["mentionContextsByGuildId"];
  onReplyToMessage: (message: ChatMessageType) => void;
  renderSignature: string;
  renderables: ChatRenderableMessage[];
  selectedGuildId: string;
};

type ChatViewport = {
  height: number;
  scrollTop: number;
};

type MeasuredChatRow = {
  height: number;
  source: unknown;
};

export function pruneChatRowMeasurements<T>(
  measuredRows: Map<string, T>,
  renderables: readonly Pick<ChatRenderableMessage, "key">[],
): void {
  if (measuredRows.size === 0) return;

  const retainedKeys = new Set(renderables.map((renderable) => renderable.key));
  for (const measuredKey of measuredRows.keys()) {
    if (!retainedKeys.has(measuredKey)) {
      measuredRows.delete(measuredKey);
    }
  }
}

type ChatVirtualLayout = {
  endIndex: number;
  renderables: ChatRenderableMessage[];
  rowHeights: number[];
  rowOffsets: number[];
  scrollTop: number;
  startIndex: number;
  totalHeight: number;
  viewportHeight: number;
};

const getChatRowMeasurementSource = (renderable: ChatRenderableMessage) =>
  renderable.kind === "date-divider"
    ? renderable.timestamp
    : renderable.message;

const getEstimatedChatRowHeight = (
  renderable: ChatRenderableMessage,
): number => {
  if (renderable.kind === "date-divider") return 20;
  if (renderable.kind === "npc-group") return 64;
  if (renderable.message.type === MessageType.PARTY_GATHERING) return 168;
  if (renderable.message.type === MessageType.NPC) return 64;

  const estimatedLineCount = Math.max(
    1,
    Math.ceil((renderable.message.message?.length ?? 0) / 32),
  );
  const replyHeight = renderable.message.replyTo ? 36 : 0;
  return 18 + estimatedLineCount * 16 + replyHeight;
};

const getMessageId = (renderable: ChatRenderableMessage) =>
  renderable.kind === "date-divider" ? null : renderable.message.id;

const getChatVirtualLayout = ({
  measuredRows,
  renderables,
  viewport,
}: {
  measuredRows: Map<string, MeasuredChatRow>;
  renderables: ChatRenderableMessage[];
  viewport: ChatViewport;
}): ChatVirtualLayout => {
  const rowOffsets: number[] = [];
  const rowHeights: number[] = [];
  let totalHeight = 0;
  let hasVisibleRow = false;

  for (const renderable of renderables) {
    const measuredRow = measuredRows.get(renderable.key);
    const measurementSource = getChatRowMeasurementSource(renderable);
    const rowHeight =
      measuredRow?.source === measurementSource
        ? measuredRow.height
        : getEstimatedChatRowHeight(renderable);

    if (rowHeight > 0 && hasVisibleRow) {
      totalHeight += CHAT_LIST_GAP_PX;
    }

    rowOffsets.push(totalHeight);
    rowHeights.push(rowHeight);
    totalHeight += rowHeight;
    hasVisibleRow ||= rowHeight > 0;
  }

  const viewportHeight = viewport.height || CHAT_LIST_FALLBACK_HEIGHT_PX;
  const visibleStartOffset = Math.max(
    0,
    viewport.scrollTop - CHAT_LIST_OVERSCAN_PX,
  );
  const visibleEndOffset =
    viewport.scrollTop + viewportHeight + CHAT_LIST_OVERSCAN_PX;
  let startIndex = 0;

  while (
    startIndex < renderables.length &&
    (rowOffsets[startIndex] ?? 0) + (rowHeights[startIndex] ?? 0) <
      visibleStartOffset
  ) {
    startIndex += 1;
  }

  let endIndex = startIndex;
  while (
    endIndex < renderables.length &&
    (rowOffsets[endIndex] ?? 0) <= visibleEndOffset
  ) {
    endIndex += 1;
  }

  return {
    endIndex,
    renderables,
    rowHeights,
    rowOffsets,
    scrollTop: viewport.scrollTop,
    startIndex,
    totalHeight,
    viewportHeight,
  };
};

export const ChatMessageList: FC<ChatMessageListProps> = ({
  ariaLabel,
  emptyStateLabel,
  guildNamesById,
  hasRenderableMessages,
  membersByGuildId,
  mentionContextsByGuildId,
  onReplyToMessage,
  renderSignature,
  renderables,
  selectedGuildId,
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const measuredRowsRef = useRef(new Map<string, MeasuredChatRow>());
  const isUserNearBottomRef = useRef(true);
  const scrollPendingRef = useRef(true);
  const previousRenderSignatureRef = useRef("");
  const previousMeasurementCycleRef = useRef(0);
  const maintainBottomThroughMeasurementCycleRef = useRef(0);
  const pendingScrollAdjustmentRef = useRef(0);
  const lastObservedScrollTopRef = useRef(0);
  const virtualLayoutRef = useRef<ChatVirtualLayout | null>(null);
  const scrollListToRef = useRef<
    (top: number, behavior?: ScrollBehavior) => void
  >(() => undefined);
  const [measurementCycle, setMeasurementCycle] = useState(0);
  const [viewport, setViewport] = useState<ChatViewport>({
    height: CHAT_LIST_FALLBACK_HEIGHT_PX,
    scrollTop: 0,
  });

  useEffect(() => {
    pruneChatRowMeasurements(measuredRowsRef.current, renderables);
  }, [renderables]);

  const virtualLayout = getChatVirtualLayout({
    measuredRows: measuredRowsRef.current,
    renderables,
    viewport,
  });
  const { endIndex, rowOffsets, startIndex, totalHeight, viewportHeight } =
    virtualLayout;
  virtualLayoutRef.current = virtualLayout;

  scrollListToRef.current = (
    top: number,
    behavior: ScrollBehavior = "auto",
  ) => {
    const scrollViewport = scrollAreaRef.current;
    if (!scrollViewport) return;

    const effectiveHeight = scrollViewport.clientHeight || viewportHeight;
    const maxScrollTop = Math.max(
      scrollViewport.scrollHeight - effectiveHeight,
      0,
    );
    const nextScrollTop = Math.min(Math.max(top, 0), maxScrollTop);

    if (typeof scrollViewport.scrollTo === "function") {
      scrollViewport.scrollTo({ top: nextScrollTop, behavior });
    } else {
      scrollViewport.scrollTop = nextScrollTop;
    }
    lastObservedScrollTopRef.current = nextScrollTop;

    setViewport((currentViewport) =>
      currentViewport.scrollTop === nextScrollTop
        ? currentViewport
        : { ...currentViewport, scrollTop: nextScrollTop },
    );
  };

  useLayoutEffect(() => {
    const scrollViewport = scrollAreaRef.current;
    if (!scrollViewport) return;

    const updateViewport = () => {
      const nextHeight = scrollViewport.clientHeight;
      const nextScrollTop = scrollViewport.scrollTop;
      const effectiveHeight = nextHeight || CHAT_LIST_FALLBACK_HEIGHT_PX;
      if (!scrollPendingRef.current) {
        const scrollDelta = nextScrollTop - lastObservedScrollTopRef.current;
        if (scrollDelta < -0.5) {
          isUserNearBottomRef.current = false;
          maintainBottomThroughMeasurementCycleRef.current = 0;
        } else if (scrollDelta > 0.5) {
          isUserNearBottomRef.current =
            scrollViewport.scrollHeight - (nextScrollTop + effectiveHeight) <=
            CHAT_AUTOSCROLL_THRESHOLD_PX;
        }
      }
      lastObservedScrollTopRef.current = nextScrollTop;

      setViewport((currentViewport) => {
        if (
          currentViewport.height === nextHeight &&
          currentViewport.scrollTop === nextScrollTop
        ) {
          return currentViewport;
        }

        return { height: nextHeight, scrollTop: nextScrollTop };
      });
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        isUserNearBottomRef.current = false;
        maintainBottomThroughMeasurementCycleRef.current = 0;
      }
    };

    updateViewport();
    scrollViewport.addEventListener("scroll", updateViewport, {
      passive: true,
    });
    scrollViewport.addEventListener("wheel", handleWheel, { passive: true });

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateViewport);
    resizeObserver?.observe(scrollViewport);

    if (!resizeObserver) {
      window.addEventListener("resize", updateViewport);
    }

    return () => {
      scrollViewport.removeEventListener("scroll", updateViewport);
      scrollViewport.removeEventListener("wheel", handleWheel);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useLayoutEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;

    const measureRows = (elements: Element[]) => {
      const currentLayout = virtualLayoutRef.current;
      if (!currentLayout) return;

      let changed = false;
      let scrollAdjustment = 0;

      for (const element of elements) {
        if (!(element instanceof HTMLElement)) continue;

        const rowIndex = Number(element.dataset.chatVirtualIndex);
        const renderable = currentLayout.renderables[rowIndex];
        if (!renderable) continue;

        const measuredHeight = element.getBoundingClientRect().height;
        if (measuredHeight <= 0 && element.childElementCount > 0) continue;

        const measurementSource = getChatRowMeasurementSource(renderable);
        const currentHeight =
          currentLayout.rowHeights[rowIndex] ?? measuredHeight;
        const currentMeasurement = measuredRowsRef.current.get(renderable.key);
        if (
          currentMeasurement?.source === measurementSource &&
          Math.abs(currentMeasurement.height - measuredHeight) < 0.5
        ) {
          continue;
        }

        measuredRowsRef.current.set(renderable.key, {
          height: measuredHeight,
          source: measurementSource,
        });
        changed = true;

        if (
          (currentLayout.rowOffsets[rowIndex] ?? 0) < currentLayout.scrollTop
        ) {
          scrollAdjustment += measuredHeight - currentHeight;
        }
      }

      if (!changed) return;

      if (isUserNearBottomRef.current) {
        maintainBottomThroughMeasurementCycleRef.current = Math.max(
          maintainBottomThroughMeasurementCycleRef.current,
          measurementCycle + 1,
        );
      } else {
        pendingScrollAdjustmentRef.current += scrollAdjustment;
      }
      setMeasurementCycle((currentCycle) => currentCycle + 1);
    };

    const visibleRows = Array.from(
      messageList.querySelectorAll("[data-chat-virtual-index]"),
    );
    measureRows(visibleRows);

    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver((entries) => {
      measureRows(entries.map((entry) => entry.target));
    });
    visibleRows.forEach((row) => resizeObserver.observe(row));

    return () => resizeObserver.disconnect();
  });

  useLayoutEffect(() => {
    if (scrollPendingRef.current) {
      if (hasRenderableMessages) {
        scrollListToRef.current(totalHeight);
        scrollPendingRef.current = false;
        isUserNearBottomRef.current = true;
      }
      previousRenderSignatureRef.current = renderSignature;
      previousMeasurementCycleRef.current = measurementCycle;
      return;
    }

    const renderChanged =
      renderSignature !== previousRenderSignatureRef.current;
    const measurementsChanged =
      measurementCycle !== previousMeasurementCycleRef.current;

    if (renderChanged && isUserNearBottomRef.current) {
      scrollListToRef.current(totalHeight);
      isUserNearBottomRef.current = true;
    } else if (
      measurementsChanged &&
      maintainBottomThroughMeasurementCycleRef.current >= measurementCycle
    ) {
      scrollListToRef.current(totalHeight);
    } else if (
      measurementsChanged &&
      pendingScrollAdjustmentRef.current !== 0
    ) {
      scrollListToRef.current(
        (virtualLayoutRef.current?.scrollTop ?? 0) +
          pendingScrollAdjustmentRef.current,
      );
      pendingScrollAdjustmentRef.current = 0;
    }

    if (maintainBottomThroughMeasurementCycleRef.current <= measurementCycle) {
      maintainBottomThroughMeasurementCycleRef.current = 0;
    }

    previousRenderSignatureRef.current = renderSignature;
    previousMeasurementCycleRef.current = measurementCycle;
  }, [hasRenderableMessages, measurementCycle, renderSignature, totalHeight]);

  useEffect(() => {
    return subscribeToChatScrollToMessage((event) => {
      const messageId = event.detail?.messageId;
      if (!messageId) return;

      const currentLayout = virtualLayoutRef.current;
      if (!currentLayout) return;

      const rowIndex = currentLayout.renderables.findIndex(
        (renderable) => getMessageId(renderable) === messageId,
      );
      if (rowIndex === -1) return;

      const rowOffset = currentLayout.rowOffsets[rowIndex] ?? 0;
      const rowHeight = currentLayout.rowHeights[rowIndex] ?? 0;
      scrollListToRef.current(
        rowOffset - (currentLayout.viewportHeight - rowHeight) / 2,
        "smooth",
      );
      isUserNearBottomRef.current = false;
    });
  }, []);

  if (renderables.length === 0) {
    return (
      <ScrollArea
        ref={scrollAreaRef}
        className="ll:h-full ll:w-full ll:box-border ll:border ll:rounded-sm ll:border-gray-400 ll:p-1"
      >
        <div className="ll:flex ll:items-center ll:justify-center ll:h-full ll:text-gray-500 ll:text-xs">
          {emptyStateLabel}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea
      ref={scrollAreaRef}
      className="ll:h-full ll:w-full ll:box-border ll:border ll:rounded-sm ll:border-gray-400 ll:p-1"
    >
      <div
        aria-label={ariaLabel}
        className="ll-chat-message-list ll:relative ll:w-full ll:min-w-0 ll:overflow-x-hidden ll:rounded-lg"
        data-ll-draggable="false"
        ref={messageListRef}
        role="list"
        style={{ height: totalHeight }}
      >
        {renderables.slice(startIndex, endIndex).map((renderable, index) => {
          const rowIndex = startIndex + index;

          return (
            <div
              aria-posinset={rowIndex + 1}
              aria-setsize={renderables.length}
              className="ll:absolute ll:left-0 ll:w-full"
              data-chat-virtual-index={rowIndex}
              key={renderable.key}
              role="listitem"
              style={{ top: rowOffsets[rowIndex] }}
            >
              {renderable.kind === "date-divider" ? (
                <ChatDateDivider timestamp={renderable.timestamp} />
              ) : renderable.kind === "npc-group" ? (
                <ChatNpcMessage
                  additionalSenderCount={renderable.additionalSenderCount}
                  all={selectedGuildId === "all"}
                  count={renderable.count}
                  guildName={guildNamesById[renderable.message.guildId]}
                  member={
                    membersByGuildId[renderable.message.guildId]?.[
                      renderable.message.senderId
                    ]
                  }
                  message={renderable.message}
                />
              ) : (
                <ChatMessage
                  all={selectedGuildId === "all"}
                  guildName={guildNamesById[renderable.message.guildId]}
                  member={
                    membersByGuildId[renderable.message.guildId]?.[
                      renderable.message.senderId
                    ]
                  }
                  mentionContext={
                    mentionContextsByGuildId[renderable.message.guildId]
                  }
                  message={renderable.message}
                  onReply={() => onReplyToMessage(renderable.message)}
                />
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
