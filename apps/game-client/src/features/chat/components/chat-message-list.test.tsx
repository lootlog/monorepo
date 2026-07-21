import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode, Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchChatScrollToMessage } from "../chat-scroll-to-message";
import type { ChatRenderableMessage } from "../chat.helpers";
import { ChatMessageList, pruneChatRowMeasurements } from "./chat-message-list";

const resizeObserverHarnesses = new Set<ResizeObserverHarness>();
const scrollRequests: ScrollToOptions[] = [];
let animationFrameCallbacks = new Map<number, FrameRequestCallback>();
let nextAnimationFrameId = 1;

const flushAnimationFrames = (frameCount: number) => {
  for (let frame = 0; frame < frameCount; frame += 1) {
    const callbacks = [...animationFrameCallbacks.values()];
    animationFrameCallbacks = new Map();
    act(() => {
      for (const callback of callbacks) callback(performance.now());
    });
  }
};

class ResizeObserverHarness implements ResizeObserver {
  readonly observedElements = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    resizeObserverHarnesses.add(this);
  }

  disconnect = vi.fn(() => {
    this.observedElements.clear();
  });

  observe = vi.fn((target: Element) => {
    this.observedElements.add(target);
  });

  unobserve = vi.fn((target: Element) => {
    this.observedElements.delete(target);
  });

  trigger(target: Element) {
    if (!this.observedElements.has(target)) return;

    this.callback([{ target } as ResizeObserverEntry], this);
  }
}

const triggerResizeObserver = (target: Element) => {
  for (const resizeObserver of resizeObserverHarnesses) {
    resizeObserver.trigger(target);
  }
};

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    ref,
  }: {
    children: ReactNode;
    ref?: Ref<HTMLDivElement>;
  }) => (
    <div data-testid="chat-scroll-viewport" ref={ref}>
      {children}
    </div>
  ),
}));

vi.mock("./chat-date-divider", () => ({
  ChatDateDivider: ({ timestamp }: { timestamp: string }) => (
    <div>{timestamp}</div>
  ),
}));

vi.mock("./chat-message", () => ({
  ChatMessage: ({ message }: { message: { id: string; message?: string } }) => (
    <div data-testid={message.id}>{message.message}</div>
  ),
}));

vi.mock("./chat-npc-message", () => ({
  ChatNpcMessage: ({ message }: { message: { id: string } }) => (
    <div data-testid={message.id} />
  ),
}));

const createRenderables = (count: number): ChatRenderableMessage[] =>
  Array.from({ length: count }, (_, index) => ({
    kind: "message" as const,
    key: `message-${index}`,
    message: {
      characterData: { nick: "Hero" },
      guildId: "guild-1",
      id: `message-${index}`,
      message: `Message ${index}`,
      senderId: "sender-1",
      timestamp: new Date(Date.UTC(2026, 6, 20, 12, 0, index)).toISOString(),
      type: "NORMAL",
    } as never,
  }));

const createMessageListElement = (
  renderables: ChatRenderableMessage[],
  selectedGuildId = "guild-1",
  instanceKey?: string,
) => (
  <ChatMessageList
    key={instanceKey}
    ariaLabel="Chat messages"
    emptyStateLabel="No messages"
    guildNamesById={{ [selectedGuildId]: "Guild" }}
    hasRenderableMessages={renderables.length > 0}
    membersByGuildId={{}}
    mentionContextsByGuildId={{}}
    onReplyToMessage={vi.fn()}
    renderSignature={renderables.map((item) => item.key).join("|")}
    renderables={renderables}
    selectedGuildId={selectedGuildId}
  />
);

const renderMessageList = (renderables: ChatRenderableMessage[]) =>
  render(createMessageListElement(renderables));

describe("ChatMessageList", () => {
  beforeEach(() => {
    animationFrameCallbacks = new Map();
    nextAnimationFrameId = 1;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const animationFrameId = nextAnimationFrameId;
      nextAnimationFrameId += 1;
      animationFrameCallbacks.set(animationFrameId, callback);
      return animationFrameId;
    });
    vi.stubGlobal("cancelAnimationFrame", (animationFrameId: number) => {
      animationFrameCallbacks.delete(animationFrameId);
    });
    scrollRequests.length = 0;
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value(this: HTMLElement, options: ScrollToOptions | number) {
        const requestedScrollTop =
          typeof options === "number"
            ? options
            : (options.top ?? this.scrollTop);
        const maximumScrollTop = Math.max(
          this.scrollHeight - this.clientHeight,
          0,
        );
        this.scrollTop = Math.min(
          Math.max(requestedScrollTop, 0),
          maximumScrollTop,
        );
        if (typeof options !== "number") {
          scrollRequests.push(options);
        }
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        if (!(this instanceof HTMLElement)) return 0;
        if (this.dataset.testid !== "chat-scroll-viewport") return 0;

        const messageList = this.querySelector<HTMLElement>('[role="list"]');
        return Number.parseFloat(messageList?.style.height ?? "0") + 24;
      },
    });
  });

  afterEach(() => {
    resizeObserverHarnesses.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("bounds mounted messages and initially anchors to the newest record", () => {
    renderMessageList(createRenderables(300));

    expect(screen.getAllByRole("listitem").length).toBeLessThanOrEqual(30);
    expect(screen.getByTestId("message-299")).toBeInTheDocument();
    expect(screen.queryByTestId("message-0")).not.toBeInTheDocument();
  });

  it("anchors exactly to the physical bottom after switching guilds", () => {
    const { rerender } = render(
      createMessageListElement(createRenderables(80), "guild-1", "guild-1"),
    );

    rerender(
      createMessageListElement(createRenderables(120), "guild-2", "guild-2"),
    );

    const viewport = screen.getByTestId("chat-scroll-viewport");
    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
  });

  it("drops cached row measurements after messages leave retention", () => {
    const measuredRows = new Map([
      ["message-0", { height: 40, source: {} }],
      ["message-1", { height: 60, source: {} }],
      ["expired-message", { height: 80, source: {} }],
    ]);

    pruneChatRowMeasurements(measuredRows, createRenderables(2));

    expect([...measuredRows.keys()]).toEqual(["message-0", "message-1"]);
  });

  it("mounts messages reached by scrolling without changing their order", () => {
    renderMessageList(createRenderables(300));
    const viewport = screen.getByTestId("chat-scroll-viewport");

    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    scrollRequests.length = 0;

    expect(screen.getByTestId("message-0")).toBeInTheDocument();
    expect(screen.queryByTestId("message-299")).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("listitem")
        .map((element) => Number(element.getAttribute("aria-posinset"))),
    ).toEqual(screen.getAllByRole("listitem").map((_, index) => index + 1));
  });

  it("uses measured variable heights to place following messages", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        const virtualIndex = this.getAttribute("data-chat-virtual-index");
        const height = virtualIndex === "0" ? 120 : 40;

        return {
          bottom: height,
          height,
          left: 0,
          right: 100,
          top: 0,
          width: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );

    renderMessageList(createRenderables(3));
    flushAnimationFrames(2);

    expect(
      document.querySelector<HTMLElement>('[data-chat-virtual-index="1"]')
        ?.style.top,
    ).toBe("124px");
  });

  it("keeps the exact scroll position while history rows are remeasured", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverHarness);
    const measuredHeightsByIndex = new Map<number, number>();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        const virtualIndex = this.getAttribute("data-chat-virtual-index");
        const rowIndex = virtualIndex === null ? null : Number(virtualIndex);
        const height =
          rowIndex === null
            ? 0
            : (measuredHeightsByIndex.get(rowIndex) ??
              40 + (rowIndex % 3) * 16);

        return {
          bottom: height,
          height,
          left: 0,
          right: 100,
          top: 0,
          width: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );

    renderMessageList(createRenderables(120));
    const viewport = screen.getByTestId("chat-scroll-viewport");
    flushAnimationFrames(30);
    const initialBottomScrollTop = viewport.scrollTop;
    expect(initialBottomScrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
    const userScrollTop = initialBottomScrollTop - 32;

    fireEvent.wheel(viewport, { deltaY: -32 });
    viewport.scrollTop = userScrollTop;
    fireEvent.scroll(viewport);
    act(() => triggerResizeObserver(viewport));

    const rowAboveViewport = Array.from(
      document.querySelectorAll<HTMLElement>("[data-chat-virtual-index]"),
    ).find((row) => Number.parseFloat(row.style.top || "0") < userScrollTop);
    expect(rowAboveViewport).toBeDefined();

    const rowIndex = Number(rowAboveViewport?.dataset.chatVirtualIndex);
    const previousHeight =
      measuredHeightsByIndex.get(rowIndex) ?? 40 + (rowIndex % 3) * 16;
    measuredHeightsByIndex.set(rowIndex, previousHeight + 24);

    act(() => triggerResizeObserver(rowAboveViewport as HTMLElement));

    expect(viewport.scrollTop).toBe(userScrollTop);
  });

  it("stays pinned to the physical bottom through late initialization measurements", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverHarness);
    const measuredHeightsByIndex = new Map<number, number>();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        const rowIndex = Number(this.dataset.chatVirtualIndex ?? 0);
        const height = measuredHeightsByIndex.get(rowIndex) ?? 40;
        return {
          bottom: height,
          height,
          left: 0,
          right: 100,
          top: 0,
          width: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );

    renderMessageList(createRenderables(120));
    const viewport = screen.getByTestId("chat-scroll-viewport");

    for (const height of [64, 88, 72]) {
      const newestMountedRow = Array.from(
        document.querySelectorAll<HTMLElement>("[data-chat-virtual-index]"),
      ).at(-1);
      expect(newestMountedRow).toBeDefined();
      measuredHeightsByIndex.set(
        Number(newestMountedRow?.dataset.chatVirtualIndex),
        height,
      );
      act(() => triggerResizeObserver(newestMountedRow as HTMLElement));
      flushAnimationFrames(4);

      expect(viewport.scrollTop).toBe(
        viewport.scrollHeight - viewport.clientHeight,
      );
    }
  });

  it("does not jump to a new message while the user reads history", () => {
    const initialRenderables = createRenderables(300);
    const { rerender } = renderMessageList(initialRenderables);
    const viewport = screen.getByTestId("chat-scroll-viewport");

    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    scrollRequests.length = 0;

    const nextRenderables = createRenderables(301);
    rerender(
      <ChatMessageList
        ariaLabel="Chat messages"
        emptyStateLabel="No messages"
        guildNamesById={{ "guild-1": "Guild" }}
        hasRenderableMessages
        membersByGuildId={{}}
        mentionContextsByGuildId={{}}
        onReplyToMessage={vi.fn()}
        renderSignature={nextRenderables.map((item) => item.key).join("|")}
        renderables={nextRenderables}
        selectedGuildId="guild-1"
      />,
    );

    expect(scrollRequests).toEqual([]);
    expect(viewport.scrollTop).toBe(0);
    expect(screen.getByTestId("message-0")).toBeInTheDocument();
    expect(screen.queryByTestId("message-300")).not.toBeInTheDocument();
  });

  it("freezes the rendered snapshot when history evicts its oldest message", () => {
    const initialRenderables = createRenderables(300);
    const { rerender } = renderMessageList(initialRenderables);
    const viewport = screen.getByTestId("chat-scroll-viewport");

    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 5_000;
    fireEvent.scroll(viewport);

    const userScrollTop = viewport.scrollTop;
    const mountedMessageId = document.querySelector<HTMLElement>(
      "[data-chat-virtual-index] [data-testid]",
    )?.dataset.testid;
    expect(mountedMessageId).toBeDefined();

    const renderablesAfterEviction = createRenderables(301).slice(1);
    rerender(createMessageListElement(renderablesAfterEviction));
    expect(viewport.scrollTop).toBe(userScrollTop);
    expect(screen.getByTestId(mountedMessageId as string)).toBeInTheDocument();
    expect(screen.queryByTestId("message-300")).not.toBeInTheDocument();
  });

  it("smoothly follows consecutive messages while anchored at the bottom", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        const rowIndex = Number(this.dataset.chatVirtualIndex ?? 0);
        const height = 48 + (rowIndex % 2) * 12;
        return {
          bottom: height,
          height,
          left: 0,
          right: 100,
          top: 0,
          width: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );
    const initialRenderables = createRenderables(100);
    const { rerender } = render(
      createMessageListElement(initialRenderables, "guild-1", "guild-1"),
    );
    const viewport = screen.getByTestId("chat-scroll-viewport");
    flushAnimationFrames(30);
    scrollRequests.length = 0;

    const withFirstMessage = createRenderables(101);
    rerender(createMessageListElement(withFirstMessage, "guild-1", "guild-1"));
    fireEvent.scroll(viewport);

    const withSecondMessage = createRenderables(102);
    rerender(createMessageListElement(withSecondMessage, "guild-1", "guild-1"));
    for (let frameBatch = 0; frameBatch < 5; frameBatch += 1) {
      flushAnimationFrames(4);
      fireEvent.scroll(viewport);
    }

    expect(scrollRequests.length).toBeGreaterThan(0);
    expect(scrollRequests.every(({ behavior }) => behavior === "smooth")).toBe(
      true,
    );
    expect(
      scrollRequests.every(
        ({ top }, index) =>
          index === 0 || (top ?? 0) >= (scrollRequests[index - 1]?.top ?? 0),
      ),
    ).toBe(true);
    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
  });

  it("smoothly returns to the latest message after sending from history", () => {
    const initialRenderables = createRenderables(100);
    const { rerender } = render(
      <ChatMessageList
        ariaLabel="Chat messages"
        emptyStateLabel="No messages"
        guildNamesById={{ "guild-1": "Guild" }}
        hasRenderableMessages
        membersByGuildId={{}}
        mentionContextsByGuildId={{}}
        onReplyToMessage={vi.fn()}
        renderSignature={initialRenderables.map((item) => item.key).join("|")}
        renderables={initialRenderables}
        scrollToBottomRequest={0}
        selectedGuildId="guild-1"
      />,
    );
    const viewport = screen.getByTestId("chat-scroll-viewport");
    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 100;
    fireEvent.scroll(viewport);
    scrollRequests.length = 0;

    const renderablesWithSentMessage = createRenderables(101);
    rerender(
      <ChatMessageList
        ariaLabel="Chat messages"
        emptyStateLabel="No messages"
        guildNamesById={{ "guild-1": "Guild" }}
        hasRenderableMessages
        membersByGuildId={{}}
        mentionContextsByGuildId={{}}
        onReplyToMessage={vi.fn()}
        renderSignature={renderablesWithSentMessage
          .map((item) => item.key)
          .join("|")}
        renderables={renderablesWithSentMessage}
        scrollToBottomRequest={1}
        selectedGuildId="guild-1"
      />,
    );
    for (let frameBatch = 0; frameBatch < 5; frameBatch += 1) {
      flushAnimationFrames(4);
      fireEvent.scroll(viewport);
    }

    expect(scrollRequests.length).toBeGreaterThan(0);
    expect(scrollRequests.every(({ behavior }) => behavior === "smooth")).toBe(
      true,
    );
    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
  });

  it("reveals an unmounted reply target through virtual scrolling", () => {
    renderMessageList(createRenderables(300));

    expect(screen.queryByTestId("message-0")).not.toBeInTheDocument();
    act(() => dispatchChatScrollToMessage("message-0"));
    fireEvent.scroll(screen.getByTestId("chat-scroll-viewport"));

    expect(screen.getByTestId("message-0")).toBeInTheDocument();
    expect(screen.getByTestId("chat-scroll-viewport").scrollTop).toBe(0);
  });
});
