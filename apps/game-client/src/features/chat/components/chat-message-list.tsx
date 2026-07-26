import { ScrollArea } from "@/components/ui/scroll-area";
import type { useChatGuildData } from "@/features/chat/hooks/use-chat-guild-data";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
  type NpcTypeColors,
} from "@lootlog/types";
import { useEffect, useLayoutEffect, useRef, useState, type FC } from "react";
import { getChatDensityStyle } from "../chat-density";
import { createChatScrollController } from "../chat-scroll-controller";
import { subscribeToChatScrollToMessage } from "../chat-scroll-to-message";
import {
  getChatRenderableMessagesSignature,
  type ChatRenderableMessage,
} from "../chat.helpers";
import { ChatDateDivider } from "./chat-date-divider";
import { EmptyState } from "@/components/empty-state";
import { MessageCircle } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { ChatNpcMessage } from "./chat-npc-message";

const CHAT_AUTOSCROLL_THRESHOLD_PX = 72;
const CHAT_LIST_FALLBACK_HEIGHT_PX = 320;

type ChatGuildData = ReturnType<typeof useChatGuildData>;

type ChatMessageListProps = {
  appearance?: ChatAppearanceSettings;
  npcTypeColors?: NpcTypeColors;
  ariaLabel: string;
  emptyStateTitle: string;
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

type ChatViewportAnchor = {
  offsetFromViewportTop: number;
  rowKey: string;
};

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

export const ChatMessageList: FC<ChatMessageListProps> = ({
  appearance = CHAT_APPEARANCE_READABLE_PRESET,
  npcTypeColors,
  ariaLabel,
  emptyStateTitle,
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
  const previousAppearanceSignatureRef = useRef(appearanceSignature);
  const previousRenderSignatureRef = useRef("");
  const previousScrollToBottomRequestRef = useRef(scrollToBottomRequest);
  const viewportAnchorRef = useRef<ChatViewportAnchor | null>(null);
  const appearanceReflowFrameRef = useRef<number | null>(null);
  const resizeCorrectionFrameRef = useRef<number | null>(null);
  const programmaticTargetExpiryFrameRef = useRef<number | null>(null);
  const getScrollSnapshotRef = useRef(() => ({
    clientHeight: CHAT_LIST_FALLBACK_HEIGHT_PX,
    scrollHeight: 0,
    scrollTop: 0,
  }));
  const captureViewportAnchorRef = useRef<() => void>(() => undefined);
  const restoreViewportAnchorRef = useRef<() => void>(() => undefined);
  const scrollToPhysicalBottomRef = useRef<() => void>(() => undefined);
  const [scrollController] = useState(() =>
    createChatScrollController({
      applyScroll: () => undefined,
      nearBottomThreshold: CHAT_AUTOSCROLL_THRESHOLD_PX,
    }),
  );
  const [displayedMessages, setDisplayedMessages] = useState({
    hasRenderableMessages: latestHasRenderableMessages,
    renderSignature: latestRenderSignature,
    renderables: latestRenderables,
  });
  const { hasRenderableMessages, renderSignature, renderables } =
    displayedMessages;
  const hasRenderedRows = renderables.length > 0;

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

  getScrollSnapshotRef.current = () => {
    const scrollViewport = scrollAreaRef.current;
    return {
      clientHeight:
        scrollViewport?.clientHeight || CHAT_LIST_FALLBACK_HEIGHT_PX,
      scrollHeight: scrollViewport?.scrollHeight ?? 0,
      scrollTop: scrollViewport?.scrollTop ?? 0,
    };
  };

  captureViewportAnchorRef.current = () => {
    const scrollViewport = scrollAreaRef.current;
    const messageList = messageListRef.current;
    if (!scrollViewport || !messageList) return;

    const viewportTop = scrollViewport.getBoundingClientRect().top;
    const firstVisibleRow = Array.from(
      messageList.querySelectorAll<HTMLElement>("[data-chat-row-key]"),
    ).find((row) => row.getBoundingClientRect().bottom > viewportTop + 1);
    if (!firstVisibleRow?.dataset.chatRowKey) return;

    viewportAnchorRef.current = {
      offsetFromViewportTop:
        firstVisibleRow.getBoundingClientRect().top - viewportTop,
      rowKey: firstVisibleRow.dataset.chatRowKey,
    };
  };

  restoreViewportAnchorRef.current = () => {
    const anchor = viewportAnchorRef.current;
    const scrollViewport = scrollAreaRef.current;
    const messageList = messageListRef.current;
    if (!anchor || !scrollViewport || !messageList) return;

    const anchoredRow = Array.from(
      messageList.querySelectorAll<HTMLElement>("[data-chat-row-key]"),
    ).find((row) => row.dataset.chatRowKey === anchor.rowKey);
    if (!anchoredRow) return;

    const currentOffset =
      anchoredRow.getBoundingClientRect().top -
      scrollViewport.getBoundingClientRect().top;
    const nextScrollTop =
      scrollViewport.scrollTop + currentOffset - anchor.offsetFromViewportTop;
    scrollController.preservePosition(
      getScrollSnapshotRef.current(),
      nextScrollTop,
    );
  };

  scrollToPhysicalBottomRef.current = () => {
    scrollController.pinToBottom(getScrollSnapshotRef.current());
  };

  useLayoutEffect(() => {
    scrollController.setApplyScroll(({ behavior, top }) => {
      const scrollViewport = scrollAreaRef.current;
      if (!scrollViewport) return;

      scrollViewport.scrollTo({ behavior, top });
      if (programmaticTargetExpiryFrameRef.current !== null) {
        cancelAnimationFrame(programmaticTargetExpiryFrameRef.current);
      }
      programmaticTargetExpiryFrameRef.current = requestAnimationFrame(() => {
        programmaticTargetExpiryFrameRef.current = null;
        scrollController.expireProgrammaticTarget();
      });
    });
  }, [scrollController]);

  useLayoutEffect(() => {
    const scrollViewport = scrollAreaRef.current;
    if (!scrollViewport) return;

    const updateScrollState = () => {
      scrollController.observe(getScrollSnapshotRef.current());
      if (scrollController.getMode() === "reading-history") {
        captureViewportAnchorRef.current();
      }
    };
    const registerUserScrollIntent = () => {
      scrollController.registerUserScrollIntent(getScrollSnapshotRef.current());
    };
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      registerUserScrollIntent();
      captureViewportAnchorRef.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        ![
          "ArrowDown",
          "ArrowUp",
          "End",
          "Home",
          "PageDown",
          "PageUp",
          " ",
        ].includes(event.key)
      ) {
        return;
      }
      registerUserScrollIntent();
      captureViewportAnchorRef.current();
    };

    scrollViewport.addEventListener("scroll", updateScrollState, {
      passive: true,
    });
    scrollViewport.addEventListener("wheel", handleWheel, { passive: true });
    scrollViewport.addEventListener("touchstart", registerUserScrollIntent, {
      passive: true,
    });
    scrollViewport.addEventListener("pointerdown", registerUserScrollIntent, {
      passive: true,
    });
    scrollViewport.addEventListener("keydown", handleKeyDown);

    return () => {
      scrollViewport.removeEventListener("scroll", updateScrollState);
      scrollViewport.removeEventListener("wheel", handleWheel);
      scrollViewport.removeEventListener(
        "touchstart",
        registerUserScrollIntent,
      );
      scrollViewport.removeEventListener(
        "pointerdown",
        registerUserScrollIntent,
      );
      scrollViewport.removeEventListener("keydown", handleKeyDown);
    };
  }, [scrollController]);

  useLayoutEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList || typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(() => {
      if (resizeCorrectionFrameRef.current !== null) return;

      resizeCorrectionFrameRef.current = requestAnimationFrame(() => {
        resizeCorrectionFrameRef.current = null;
        if (scrollController.shouldFollowNewMessages()) {
          scrollToPhysicalBottomRef.current();
        } else {
          restoreViewportAnchorRef.current();
        }
      });
    });
    resizeObserver.observe(messageList);

    return () => resizeObserver.disconnect();
  }, [hasRenderedRows, scrollController]);

  useLayoutEffect(() => {
    if (!hasRenderableMessages || renderables.length === 0) return;

    const isInitialLayout =
      previousRenderSignatureRef.current === "" &&
      scrollController.getMode() === "initializing";
    const renderablesChanged =
      previousRenderSignatureRef.current !== renderSignature;
    const appearanceChanged =
      previousAppearanceSignatureRef.current !== appearanceSignature;
    const ownMessageScrollRequested =
      previousScrollToBottomRequestRef.current !== scrollToBottomRequest;

    if (appearanceChanged) {
      const shouldFollowBottom = scrollController.shouldFollowNewMessages();
      if (appearanceReflowFrameRef.current !== null) {
        cancelAnimationFrame(appearanceReflowFrameRef.current);
      }
      appearanceReflowFrameRef.current = requestAnimationFrame(() => {
        appearanceReflowFrameRef.current = null;
        if (shouldFollowBottom) {
          scrollController.requestFollowBottom();
          scrollToPhysicalBottomRef.current();
        } else {
          restoreViewportAnchorRef.current();
        }
      });
    } else if (isInitialLayout || ownMessageScrollRequested) {
      scrollController.requestFollowBottom();
      scrollToPhysicalBottomRef.current();
      scrollController.completeInitialization();
    } else if (
      renderablesChanged &&
      scrollController.shouldFollowNewMessages()
    ) {
      scrollToPhysicalBottomRef.current();
    }

    previousAppearanceSignatureRef.current = appearanceSignature;
    previousRenderSignatureRef.current = renderSignature;
    previousScrollToBottomRequestRef.current = scrollToBottomRequest;
  }, [
    appearanceSignature,
    hasRenderableMessages,
    renderSignature,
    renderables.length,
    scrollController,
    scrollToBottomRequest,
  ]);

  useEffect(
    () =>
      subscribeToChatScrollToMessage((event) => {
        const messageId = event.detail?.messageId;
        const scrollViewport = scrollAreaRef.current;
        const messageList = messageListRef.current;
        if (!messageId || !scrollViewport || !messageList) return;

        const targetMessage = Array.from(
          messageList.querySelectorAll<HTMLElement>("[data-chat-message-id]"),
        ).find((message) => message.dataset.chatMessageId === messageId);
        const targetRow = targetMessage?.closest<HTMLElement>(
          "[data-chat-row-key]",
        );
        if (!targetRow) return;

        const viewportRect = scrollViewport.getBoundingClientRect();
        const targetRect = targetRow.getBoundingClientRect();
        const targetScrollTop =
          scrollViewport.scrollTop +
          targetRect.top -
          viewportRect.top -
          (scrollViewport.clientHeight - targetRect.height) / 2;
        scrollController.jumpToMessage(
          getScrollSnapshotRef.current(),
          targetScrollTop,
        );
      }),
    [scrollController],
  );

  useEffect(
    () => () => {
      for (const animationFrameId of [
        appearanceReflowFrameRef.current,
        resizeCorrectionFrameRef.current,
        programmaticTargetExpiryFrameRef.current,
      ]) {
        if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      }
    },
    [],
  );

  if (renderables.length === 0) {
    return (
      <EmptyState
        className="ll:box-border ll:rounded-sm ll:border ll:border-gray-400"
        icon={MessageCircle}
        title={emptyStateTitle}
      />
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
        className="ll-chat-message-list ll:flex ll:w-full ll:min-w-0 ll:flex-col ll:overflow-x-hidden ll:rounded-lg"
        data-ll-draggable="false"
        ref={messageListRef}
        role="list"
        style={{
          ...getChatDensityStyle(appearance.fontScalePercent),
          gap: appearance.messageGapPx,
          overflowAnchor: "none",
        }}
      >
        {renderables.map((renderable, index) => (
          <div
            aria-posinset={index + 1}
            aria-setsize={renderables.length}
            data-chat-row-key={renderable.key}
            key={renderable.key}
            role="listitem"
          >
            {renderable.kind === "date-divider" ? (
              <ChatDateDivider timestamp={renderable.timestamp} />
            ) : renderable.kind === "npc-group" ? (
              <ChatNpcMessage
                appearance={appearance}
                all={selectedGuildId === "all"}
                count={renderable.count}
                guildName={guildNamesById[renderable.message.guildId]}
                member={
                  membersByGuildId[renderable.message.guildId]?.[
                    renderable.message.senderId
                  ]
                }
                message={renderable.message}
                npcTypeColors={npcTypeColors}
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
                npcTypeColors={npcTypeColors}
                onReply={() => onReplyToMessage(renderable.message)}
              />
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
