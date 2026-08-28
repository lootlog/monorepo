import { ScrollArea } from "@/components/ui/scroll-area";
import type { useChatGuildData } from "@/features/chat/hooks/use-chat-guild-data";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
  type NpcTypeColors,
} from "@lootlog/types";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type FC,
} from "react";
import { getChatDensityStyle } from "../chat-density";
import { createChatScrollController } from "../chat-scroll-controller";
import { subscribeToChatScrollToMessage } from "../chat-scroll-to-message";
import type { ChatRenderableMessage } from "../chat.helpers";
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

export const ChatMessageList: FC<ChatMessageListProps> = ({
  appearance = CHAT_APPEARANCE_READABLE_PRESET,
  npcTypeColors,
  ariaLabel,
  emptyStateTitle,
  guildNamesById,
  hasRenderableMessages,
  membersByGuildId,
  mentionContextsByGuildId,
  onReplyToMessage,
  renderSignature,
  renderables,
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
  const [scrollController] = useState(() =>
    createChatScrollController({
      applyScroll: () => undefined,
      nearBottomThreshold: CHAT_AUTOSCROLL_THRESHOLD_PX,
    }),
  );
  const hasRenderedRows = renderables.length > 0;

  const getScrollSnapshot = useEffectEvent(() => {
    const scrollViewport = scrollAreaRef.current;
    return {
      clientHeight:
        scrollViewport?.clientHeight || CHAT_LIST_FALLBACK_HEIGHT_PX,
      scrollHeight: scrollViewport?.scrollHeight ?? 0,
      scrollTop: scrollViewport?.scrollTop ?? 0,
    };
  });

  const captureViewportAnchor = useEffectEvent(() => {
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
  });

  const restoreViewportAnchor = useEffectEvent(() => {
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
    scrollController.preservePosition(getScrollSnapshot(), nextScrollTop);
  });

  const scrollToPhysicalBottom = useEffectEvent(() => {
    scrollController.pinToBottom(getScrollSnapshot());
  });

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
      const snapshot = getScrollSnapshot();
      scrollController.observe(snapshot);
      if (scrollController.getMode() === "reading-history") {
        captureViewportAnchor();
      }
    };
    const registerUserScrollIntent = () => {
      const snapshot = getScrollSnapshot();
      scrollController.registerUserScrollIntent(snapshot);
    };
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      registerUserScrollIntent();
      captureViewportAnchor();
    };
    const handleTouchStart = () => {
      registerUserScrollIntent();
    };
    const handlePointerDown = () => {
      registerUserScrollIntent();
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
      captureViewportAnchor();
    };

    scrollViewport.addEventListener("scroll", updateScrollState, {
      passive: true,
    });
    scrollViewport.addEventListener("wheel", handleWheel, { passive: true });
    scrollViewport.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scrollViewport.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    scrollViewport.addEventListener("keydown", handleKeyDown);

    return () => {
      scrollViewport.removeEventListener("scroll", updateScrollState);
      scrollViewport.removeEventListener("wheel", handleWheel);
      scrollViewport.removeEventListener("touchstart", handleTouchStart);
      scrollViewport.removeEventListener("pointerdown", handlePointerDown);
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
        const shouldFollowNewMessages =
          scrollController.shouldFollowNewMessages();
        if (shouldFollowNewMessages) {
          scrollToPhysicalBottom();
        } else {
          restoreViewportAnchor();
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
          scrollToPhysicalBottom();
        } else {
          restoreViewportAnchor();
        }
      });
    } else if (isInitialLayout || ownMessageScrollRequested) {
      scrollController.requestFollowBottom();
      scrollToPhysicalBottom();
      scrollController.completeInitialization();
    } else if (
      renderablesChanged &&
      scrollController.shouldFollowNewMessages()
    ) {
      scrollToPhysicalBottom();
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
        scrollController.jumpToMessage(getScrollSnapshot(), targetScrollTop);
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
