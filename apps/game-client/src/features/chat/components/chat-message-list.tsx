import { MessageType } from "@/api/chat.api";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { useChatGuildData } from "@/features/chat/hooks/use-chat-guild-data";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import { createChatScrollController } from "../chat-scroll-controller";
import { subscribeToChatScrollToMessage } from "../chat-scroll-to-message";
import {
  getChatRenderableMessagesSignature,
  type ChatRenderableMessage,
} from "../chat.helpers";
import { ChatDateDivider } from "./chat-date-divider";
import { ChatMessage } from "./chat-message";
import { ChatNpcMessage } from "./chat-npc-message";
import { pruneChatRowMeasurements } from "../chat-row-measurements";
import { useEffect, useLayoutEffect, useRef, useState, type FC } from "react";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/types";

const CHAT_AUTOSCROLL_THRESHOLD_PX = 100;
const CHAT_LIST_FALLBACK_HEIGHT_PX = 320;
const CHAT_LIST_OVERSCAN_PX = 160;

const observeElementResize = (observer: ResizeObserver, element: Element) => {
  observer.observe(element);
};

type ChatGuildData = ReturnType<typeof useChatGuildData>;

type ChatMessageListProps = {
  appearance?: ChatAppearanceSettings;
  ariaLabel: string;
  emptyStateLabel: string;
  guildNamesById: Record<string, string>;
  hasRenderableMessages: boolean;
  membersByGuildId: ChatGuildData["membersByGuildId"];
  mentionContextsByGuildId: ChatGuildData["mentionContextsByGuildId"];
  onReplyToMessage: (message: ChatMessageType) => void;
  renderSignature: string;
  renderables: ChatRenderableMessage[];
  scrollToBottomRequest?: number;
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

const getChatRowMeasurementSource = (
  renderable: ChatRenderableMessage,
  appearanceSignature: string,
) =>
  `${renderable.kind === "date-divider" ? renderable.timestamp : renderable.key}:${appearanceSignature}`;

const refreshDisplayedChatRenderables = (
  displayedRenderables: ChatRenderableMessage[],
  latestRenderables: ChatRenderableMessage[],
) => {
  const latestRenderablesByKey = new Map(
    latestRenderables.map((renderable) => [renderable.key, renderable]),
  );

  return displayedRenderables.map(
    (renderable) => latestRenderablesByKey.get(renderable.key) ?? renderable,
  );
};

const getEstimatedChatRowHeight = (
  renderable: ChatRenderableMessage,
  scale: number,
): number => {
  let estimatedHeight: number;

  if (renderable.kind === "date-divider") {
    estimatedHeight = 20;
  } else if (renderable.kind === "npc-group") {
    estimatedHeight = 64;
  } else if (renderable.message.type === MessageType.PARTY_GATHERING) {
    estimatedHeight = 168;
  } else if (renderable.message.type === MessageType.NPC) {
    estimatedHeight = 64;
  } else {
    const estimatedLineCount = Math.max(
      1,
      Math.ceil((renderable.message.message?.length ?? 0) / 32),
    );
    const replyHeight = renderable.message.replyTo ? 36 : 0;
    estimatedHeight = 18 + estimatedLineCount * 16 + replyHeight;
  }

  return estimatedHeight * scale;
};

const getMessageId = (renderable: ChatRenderableMessage) =>
  renderable.kind === "date-divider" ? null : renderable.message.id;

const updateChatScrollControllerSnapshot = (
  controller: ReturnType<typeof createChatScrollController>,
  snapshot: {
    clientHeight: number;
    scrollHeight: number;
    scrollTop: number;
  },
) => controller.observe(snapshot);

const getChatVirtualLayout = ({
  appearanceSignature,
  gapPx,
  scale,
  measuredRows,
  renderables,
  viewport,
}: {
  appearanceSignature: string;
  gapPx: number;
  scale: number;
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
    const measurementSource = getChatRowMeasurementSource(
      renderable,
      appearanceSignature,
    );
    const rowHeight =
      measuredRow?.source === measurementSource
        ? measuredRow.height
        : getEstimatedChatRowHeight(renderable, scale);

    if (rowHeight > 0 && hasVisibleRow) {
      totalHeight += gapPx;
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
  appearance = CHAT_APPEARANCE_READABLE_PRESET,
  ariaLabel,
  emptyStateLabel,
  guildNamesById,
  hasRenderableMessages: latestHasRenderableMessages,
  membersByGuildId,
  mentionContextsByGuildId,
  onReplyToMessage,
  renderSignature: latestRenderSignature,
  renderables: latestRenderables,
  scrollToBottomRequest = 0,
  selectedGuildId,
}) => {
  const appearanceSignature = JSON.stringify(appearance);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const measuredRowsRef = useRef(new Map<string, MeasuredChatRow>());
  const [measurementCycle, setMeasurementCycle] = useState(0);
  const [viewport, setViewport] = useState<ChatViewport>({
    height: CHAT_LIST_FALLBACK_HEIGHT_PX,
    scrollTop: 0,
  });
  const [scrollController] = useState(() =>
    createChatScrollController({
      applyScroll: () => undefined,
      nearBottomThreshold: CHAT_AUTOSCROLL_THRESHOLD_PX,
    }),
  );

  useLayoutEffect(() => {
    scrollController.setApplyScroll(({ behavior, top }) => {
      const scrollViewport = scrollAreaRef.current;
      if (!scrollViewport) return;

      if (typeof scrollViewport.scrollTo === "function") {
        scrollViewport.scrollTo({ behavior, top });
      } else {
        scrollViewport.scrollTop = top;
      }

      if (behavior === "auto") {
        setViewport((currentViewport) => {
          const nextViewport = {
            height: scrollViewport.clientHeight,
            scrollTop: scrollViewport.scrollTop,
          };
          return currentViewport.height === nextViewport.height &&
            currentViewport.scrollTop === nextViewport.scrollTop
            ? currentViewport
            : nextViewport;
        });
      }
    });
  }, [scrollController]);
  const scrollPendingRef = useRef(true);
  const previousRenderSignatureRef = useRef("");
  const previousMeasurementCycleRef = useRef(0);
  const previousScrollToBottomRequestRef = useRef(scrollToBottomRequest);
  const pendingBottomAnimationRef = useRef(false);
  const bottomAnimationFrameRef = useRef<number | null>(null);
  const initializationAnimationFrameRef = useRef<number | null>(null);
  const measurementAnimationFrameRef = useRef<number | null>(null);
  const virtualLayoutRef = useRef<ChatVirtualLayout | null>(null);
  const [displayedMessages, setDisplayedMessages] = useState({
    hasRenderableMessages: latestHasRenderableMessages,
    renderSignature: latestRenderSignature,
    renderables: latestRenderables,
  });
  const { hasRenderableMessages, renderSignature, renderables } =
    displayedMessages;

  useEffect(() => {
    const ownMessageScrollRequested =
      scrollToBottomRequest !== previousScrollToBottomRequestRef.current;
    const shouldUseLatestMessages =
      scrollController.getMode() !== "reading-history" ||
      ownMessageScrollRequested;

    setDisplayedMessages((currentMessages) => {
      if (shouldUseLatestMessages) {
        return {
          hasRenderableMessages: latestHasRenderableMessages,
          renderSignature: latestRenderSignature,
          renderables: latestRenderables,
        };
      }

      const refreshedRenderables = refreshDisplayedChatRenderables(
        currentMessages.renderables,
        latestRenderables,
      );
      return {
        ...currentMessages,
        renderSignature:
          getChatRenderableMessagesSignature(refreshedRenderables),
        renderables: refreshedRenderables,
      };
    });
  }, [
    latestHasRenderableMessages,
    latestRenderSignature,
    latestRenderables,
    scrollController,
    scrollToBottomRequest,
  ]);

  useEffect(() => {
    pruneChatRowMeasurements(measuredRowsRef.current, renderables);
  }, [renderables]);

  const virtualLayout = getChatVirtualLayout({
    appearanceSignature,
    gapPx: appearance.messageGapPx,
    scale: appearance.fontScalePercent / 100,
    measuredRows: measuredRowsRef.current,
    renderables,
    viewport,
  });
  const { endIndex, rowOffsets, startIndex, totalHeight } = virtualLayout;

  useLayoutEffect(() => {
    virtualLayoutRef.current = virtualLayout;
  }, [virtualLayout]);

  const getScrollSnapshot = () => {
    const scrollViewport = scrollAreaRef.current;
    if (!scrollViewport) return null;

    return {
      clientHeight: scrollViewport.clientHeight || CHAT_LIST_FALLBACK_HEIGHT_PX,
      scrollHeight: scrollViewport.scrollHeight,
      scrollTop: scrollViewport.scrollTop,
    };
  };

  useLayoutEffect(() => {
    const scrollViewport = scrollAreaRef.current;
    if (!scrollViewport) return;

    const updateViewport = () => {
      const nextHeight = scrollViewport.clientHeight;
      const nextScrollTop = scrollViewport.scrollTop;
      const effectiveHeight = nextHeight || CHAT_LIST_FALLBACK_HEIGHT_PX;
      if (!scrollPendingRef.current) {
        updateChatScrollControllerSnapshot(scrollController, {
          clientHeight: effectiveHeight,
          scrollHeight: scrollViewport.scrollHeight,
          scrollTop: nextScrollTop,
        });
      }

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
        const snapshot = getScrollSnapshot();
        if (snapshot) {
          pendingBottomAnimationRef.current = false;
          if (bottomAnimationFrameRef.current !== null) {
            cancelAnimationFrame(bottomAnimationFrameRef.current);
            bottomAnimationFrameRef.current = null;
          }
          scrollController.registerUserScrollIntent(snapshot);
        }
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
    if (resizeObserver) {
      observeElementResize(resizeObserver, scrollViewport);
    }

    if (!resizeObserver) {
      window.addEventListener("resize", updateViewport);
    }

    return () => {
      scrollViewport.removeEventListener("scroll", updateViewport);
      scrollViewport.removeEventListener("wheel", handleWheel);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, [scrollController]);

  useLayoutEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return () => undefined;

    const measureRows = (elements: Element[]) => {
      const currentLayout = virtualLayoutRef.current;
      if (!currentLayout) return;

      let changed = false;
      for (const element of elements) {
        if (!(element instanceof HTMLElement)) continue;

        const rowIndex = Number(element.dataset.chatVirtualIndex);
        const renderable = currentLayout.renderables[rowIndex];
        if (!renderable) continue;

        const devicePixelRatio = window.devicePixelRatio || 1;
        const measuredHeight =
          Math.round(
            element.getBoundingClientRect().height * devicePixelRatio,
          ) / devicePixelRatio;
        if (measuredHeight <= 0 && element.childElementCount > 0) continue;

        const measurementSource = getChatRowMeasurementSource(
          renderable,
          appearanceSignature,
        );
        const currentMeasurement = measuredRowsRef.current.get(renderable.key);
        if (
          currentMeasurement?.source === measurementSource &&
          Math.abs(currentMeasurement.height - measuredHeight) <
            1 / devicePixelRatio
        ) {
          continue;
        }

        measuredRowsRef.current.set(renderable.key, {
          height: measuredHeight,
          source: measurementSource,
        });
        changed = true;
      }

      if (!changed) return;

      const scrollMode = scrollController.getMode();
      if (
        scrollMode === "animating-to-bottom" ||
        scrollMode === "following-bottom"
      ) {
        pendingBottomAnimationRef.current = true;
      }
      if (measurementAnimationFrameRef.current === null) {
        measurementAnimationFrameRef.current = requestAnimationFrame(() => {
          measurementAnimationFrameRef.current = null;
          setMeasurementCycle((currentCycle) => currentCycle + 1);
        });
      }
    };

    const visibleRows = Array.from(
      messageList.querySelectorAll("[data-chat-virtual-index]"),
    );
    measureRows(visibleRows);

    if (typeof ResizeObserver === "undefined") return () => undefined;

    const resizeObserver = new ResizeObserver((entries) => {
      measureRows(entries.map((entry) => entry.target));
    });
    visibleRows.forEach((row) => observeElementResize(resizeObserver, row));

    return () => resizeObserver.disconnect();
  });

  useLayoutEffect(() => {
    const controller = scrollController;
    const snapshot = getScrollSnapshot();
    if (!controller || !snapshot) return;

    if (scrollPendingRef.current) {
      if (hasRenderableMessages) {
        controller.pinToBottom(snapshot);
        scrollPendingRef.current = false;
      }
      previousRenderSignatureRef.current = renderSignature;
      previousMeasurementCycleRef.current = measurementCycle;
      return;
    }

    const renderChanged =
      renderSignature !== previousRenderSignatureRef.current;
    const measurementsChanged =
      measurementCycle !== previousMeasurementCycleRef.current;
    const ownMessageScrollRequested =
      scrollToBottomRequest !== previousScrollToBottomRequestRef.current;

    if (ownMessageScrollRequested) {
      if (bottomAnimationFrameRef.current !== null) {
        cancelAnimationFrame(bottomAnimationFrameRef.current);
        bottomAnimationFrameRef.current = null;
      }
      if (scrollAreaRef.current) {
        scrollAreaRef.current.style.overflowAnchor = "none";
      }
      controller.requestFollowBottom();
      controller.animateToBottom(snapshot);
      pendingBottomAnimationRef.current = false;
    } else if (renderChanged && controller.shouldFollowNewMessages()) {
      pendingBottomAnimationRef.current = true;
    }

    previousRenderSignatureRef.current = renderSignature;
    previousMeasurementCycleRef.current = measurementCycle;
    previousScrollToBottomRequestRef.current = scrollToBottomRequest;

    if (!measurementsChanged || pendingBottomAnimationRef.current) return;

    const mode = controller.getMode();
    if (mode === "following-bottom") {
      controller.pinToBottom(getScrollSnapshot() ?? snapshot);
    }
  }, [
    hasRenderableMessages,
    measurementCycle,
    renderSignature,
    scrollController,
    scrollToBottomRequest,
    totalHeight,
  ]);

  useLayoutEffect(() => {
    if (
      !pendingBottomAnimationRef.current ||
      bottomAnimationFrameRef.current !== null
    ) {
      return;
    }

    const controller = scrollController;
    if (!controller) return;

    let previousScrollHeight: number | null = null;
    let stableFrameCount = 0;

    const animateAfterStableLayout = () => {
      const snapshot = getScrollSnapshot();
      if (!snapshot || !pendingBottomAnimationRef.current) {
        bottomAnimationFrameRef.current = null;
        return;
      }

      if (snapshot.scrollHeight === previousScrollHeight) {
        stableFrameCount += 1;
      } else {
        previousScrollHeight = snapshot.scrollHeight;
        stableFrameCount = 0;
      }

      if (stableFrameCount >= 2) {
        controller.completeInitialization();
        controller.animateToBottom(snapshot);
        pendingBottomAnimationRef.current = false;
        bottomAnimationFrameRef.current = null;
        return;
      }

      bottomAnimationFrameRef.current = requestAnimationFrame(
        animateAfterStableLayout,
      );
    };

    bottomAnimationFrameRef.current = requestAnimationFrame(
      animateAfterStableLayout,
    );
  }, [
    measurementCycle,
    renderSignature,
    scrollController,
    scrollToBottomRequest,
  ]);

  useEffect(() => {
    const controller = scrollController;
    if (
      !hasRenderableMessages ||
      !controller ||
      controller.getMode() !== "initializing"
    ) {
      return;
    }

    let previousScrollHeight: number | null = null;
    let stableFrameCount = 0;

    const verifyInitialBottom = () => {
      const snapshot = getScrollSnapshot();
      if (!snapshot || controller.getMode() !== "initializing") return;

      controller.pinToBottom(snapshot);
      const settledSnapshot = getScrollSnapshot() ?? snapshot;
      const distanceFromBottom =
        settledSnapshot.scrollHeight -
        (settledSnapshot.scrollTop + settledSnapshot.clientHeight);
      if (
        previousScrollHeight === settledSnapshot.scrollHeight &&
        Math.abs(distanceFromBottom) <= 1
      ) {
        stableFrameCount += 1;
      } else {
        stableFrameCount = 0;
      }
      previousScrollHeight = settledSnapshot.scrollHeight;

      if (stableFrameCount >= 2) {
        controller.completeInitialization();
        return;
      }

      initializationAnimationFrameRef.current =
        requestAnimationFrame(verifyInitialBottom);
    };

    initializationAnimationFrameRef.current =
      requestAnimationFrame(verifyInitialBottom);
    return () => {
      if (initializationAnimationFrameRef.current !== null) {
        cancelAnimationFrame(initializationAnimationFrameRef.current);
        initializationAnimationFrameRef.current = null;
      }
    };
  }, [hasRenderableMessages, scrollController]);

  useEffect(() => {
    return () => {
      if (bottomAnimationFrameRef.current !== null) {
        cancelAnimationFrame(bottomAnimationFrameRef.current);
      }
      if (measurementAnimationFrameRef.current !== null) {
        cancelAnimationFrame(measurementAnimationFrameRef.current);
      }
    };
  }, [scrollController]);

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
      const snapshot = getScrollSnapshot();
      if (!snapshot) return;
      scrollController.jumpToMessage(
        snapshot,
        rowOffset - (currentLayout.viewportHeight - rowHeight) / 2,
      );
    });
  }, [scrollController]);

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
      viewportStyle={{ overflowAnchor: "none" }}
    >
      <div
        aria-label={ariaLabel}
        className="ll-chat-message-list ll:relative ll:w-full ll:min-w-0 ll:overflow-x-hidden ll:rounded-lg"
        data-ll-draggable="false"
        ref={messageListRef}
        role="list"
        style={{
          height: totalHeight,
          overflowAnchor: "none",
        }}
      >
        {renderables.slice(startIndex, endIndex).map((renderable, index) => {
          const rowIndex = startIndex + index;

          return (
            <div
              aria-posinset={rowIndex + 1}
              aria-setsize={renderables.length}
              className="ll:absolute ll:left-0 ll:w-full"
              data-chat-row-key={renderable.key}
              data-chat-virtual-index={rowIndex}
              key={renderable.key}
              role="listitem"
              style={{
                top: rowOffsets[rowIndex],
                zoom: appearance.fontScalePercent / 100,
              }}
            >
              {renderable.kind === "date-divider" ? (
                <ChatDateDivider timestamp={renderable.timestamp} />
              ) : renderable.kind === "npc-group" ? (
                <ChatNpcMessage
                  appearance={appearance}
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
                  appearance={appearance}
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
