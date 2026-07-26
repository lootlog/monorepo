import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode, Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatAppearanceSettings } from "@lootlog/types";
import { dispatchChatScrollToMessage } from "../chat-scroll-to-message";
import type { ChatRenderableMessage } from "../chat.helpers";
import { ChatMessageList } from "./chat-message-list";

const resizeObserverHarnesses = new Set<ResizeObserverHarness>();
const scrollRequests: ScrollToOptions[] = [];
const rowHeightOverrides = new Map<string, number>();
let animationFrameCallbacks = new Map<number, FrameRequestCallback>();
let nextAnimationFrameId = 1;
let rowHeightScale = 1;

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

const triggerMessageListResize = () => {
  const messageList = screen.getByRole("list");
  act(() => {
    for (const resizeObserver of resizeObserverHarnesses) {
      resizeObserver.trigger(messageList);
    }
  });
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
  ChatMessage: ({
    message,
  }: {
    message: {
      id: string;
      message?: string;
      partyGathering?: { notificationId: string };
    };
  }) => (
    <div data-chat-message-id={message.id} data-testid={message.id}>
      {message.message}
      {message.partyGathering && <button type="button">Join party</button>}
    </div>
  ),
}));

vi.mock("./chat-npc-message", () => ({
  ChatNpcMessage: ({ message }: { message: { id: string } }) => (
    <div data-chat-message-id={message.id} data-testid={message.id} />
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
  appearance?: ChatAppearanceSettings,
  scrollToBottomRequest = 0,
) => (
  <ChatMessageList
    appearance={appearance}
    key={instanceKey}
    ariaLabel="Chat messages"
    emptyStateTitle="No messages"
    guildNamesById={{ [selectedGuildId]: "Guild" }}
    hasRenderableMessages={renderables.length > 0}
    membersByGuildId={{}}
    mentionContextsByGuildId={{}}
    onReplyToMessage={vi.fn()}
    renderSignature={renderables.map((item) => item.key).join("|")}
    renderables={renderables}
    scrollToBottomRequest={scrollToBottomRequest}
    selectedGuildId={selectedGuildId}
  />
);

const renderMessageList = (renderables: ChatRenderableMessage[]) =>
  render(createMessageListElement(renderables));

const getRowHeight = (row: HTMLElement) =>
  (rowHeightOverrides.get(row.dataset.chatRowKey ?? "") ?? 34) * rowHeightScale;

const getListGap = (messageList: HTMLElement) =>
  Number.parseFloat(messageList.style.gap || "0");

const getMessageRows = (messageList: HTMLElement) =>
  Array.from(
    messageList.querySelectorAll<HTMLElement>(":scope > [data-chat-row-key]"),
  );

const getListHeight = (messageList: HTMLElement) => {
  const rows = getMessageRows(messageList);
  const contentHeight = rows.reduce(
    (height, row) => height + getRowHeight(row),
    0,
  );
  return contentHeight + Math.max(rows.length - 1, 0) * getListGap(messageList);
};

const getRowTop = (row: HTMLElement) => {
  const messageList = row.parentElement;
  if (!messageList) return 0;

  const rows = getMessageRows(messageList);
  const rowIndex = rows.indexOf(row);
  const precedingHeight = rows
    .slice(0, rowIndex)
    .reduce((height, precedingRow) => height + getRowHeight(precedingRow), 0);
  return precedingHeight + Math.max(rowIndex, 0) * getListGap(messageList);
};

const getFirstVisibleRow = () => {
  return screen
    .getAllByRole("listitem")
    .find((row) => row.getBoundingClientRect().bottom > 1);
};

describe("ChatMessageList", () => {
  beforeEach(() => {
    animationFrameCallbacks = new Map();
    nextAnimationFrameId = 1;
    rowHeightOverrides.clear();
    rowHeightScale = 1;
    scrollRequests.length = 0;
    vi.stubGlobal("ResizeObserver", ResizeObserverHarness);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const animationFrameId = nextAnimationFrameId;
      nextAnimationFrameId += 1;
      animationFrameCallbacks.set(animationFrameId, callback);
      return animationFrameId;
    });
    vi.stubGlobal("cancelAnimationFrame", (animationFrameId: number) => {
      animationFrameCallbacks.delete(animationFrameId);
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return this instanceof HTMLElement &&
          this.dataset.testid === "chat-scroll-viewport"
          ? 240
          : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        if (
          !(this instanceof HTMLElement) ||
          this.dataset.testid !== "chat-scroll-viewport"
        ) {
          return 0;
        }
        const messageList = this.querySelector<HTMLElement>('[role="list"]');
        return messageList ? getListHeight(messageList) + 24 : 0;
      },
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
          Math.max(
            Number.isFinite(requestedScrollTop) ? requestedScrollTop : 0,
            0,
          ),
          maximumScrollTop,
        );
        if (typeof options !== "number") scrollRequests.push(options);
        this.dispatchEvent(new Event("scroll"));
      },
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        const viewport = document.querySelector<HTMLElement>(
          '[data-testid="chat-scroll-viewport"]',
        );
        let top = 0;
        let height = 0;

        if (this.dataset.testid === "chat-scroll-viewport") {
          height = 240;
        } else if (this.dataset.chatRowKey) {
          top = getRowTop(this) - (viewport?.scrollTop ?? 0);
          height = getRowHeight(this);
        } else if (this.getAttribute("role") === "list") {
          top = -(viewport?.scrollTop ?? 0);
          height = getListHeight(this);
        }

        return {
          bottom: top + height,
          height,
          left: 0,
          right: 400,
          top,
          width: 400,
          x: 0,
          y: top,
          toJSON: () => ({}),
        };
      },
    );
  });

  afterEach(() => {
    resizeObserverHarnesses.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the complete bounded history and initially anchors to the bottom", () => {
    renderMessageList(createRenderables(500));

    expect(screen.getAllByRole("listitem")).toHaveLength(500);
    expect(screen.getByTestId("message-0")).toBeInTheDocument();
    expect(screen.getByTestId("message-499")).toBeInTheDocument();
    const viewport = screen.getByTestId("chat-scroll-viewport");
    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
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

  it("stays at the physical bottom when switched guild messages load after the empty state", () => {
    const { rerender } = render(
      createMessageListElement([], "guild-2", "guild-2"),
    );

    rerender(
      createMessageListElement(createRenderables(120), "guild-2", "guild-2"),
    );

    const viewport = screen.getByTestId("chat-scroll-viewport");
    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );

    rowHeightScale = 1.001;
    triggerMessageListResize();
    flushAnimationFrames(2);

    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
  });

  it("uses native flex spacing and real density variables without zoom", () => {
    render(
      createMessageListElement(createRenderables(3), "guild-1", undefined, {
        npcLayout: "tile",
        fontScalePercent: 70,
        messageGapPx: 12,
        showTimestamp: true,
        showGuildLabel: true,
        showNpcAvatar: true,
        showNpcLevel: true,
        showNpcLocationAndCoordinates: true,
      }),
    );

    const list = screen.getByRole("list");
    expect(list.style.gap).toBe("12px");
    expect(list.style.getPropertyValue("--ll-chat-font-size")).toBe("8.4px");
    expect(document.querySelector('[style*="zoom"]')).not.toBeInTheDocument();
  });

  it("does not issue scroll commands while settled content stays idle", () => {
    renderMessageList(createRenderables(120));
    const viewport = screen.getByTestId("chat-scroll-viewport");
    scrollRequests.length = 0;
    const initialMetrics = {
      rows: screen.getAllByRole("listitem").length,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
    };

    for (let resizeIndex = 0; resizeIndex < 6; resizeIndex += 1) {
      triggerMessageListResize();
      flushAnimationFrames(2);
    }

    expect({
      rows: screen.getAllByRole("listitem").length,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
    }).toEqual(initialMetrics);
    expect(scrollRequests).toHaveLength(0);
  });

  it("stays at the physical bottom when content resizes", () => {
    renderMessageList(createRenderables(120));
    const viewport = screen.getByTestId("chat-scroll-viewport");
    rowHeightScale = 1.25;

    triggerMessageListResize();
    flushAnimationFrames(2);

    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
  });

  it("reflows appearance at the bottom without starting a scroll animation", () => {
    const renderables = createRenderables(120);
    const readableAppearance: ChatAppearanceSettings = {
      npcLayout: "tile",
      fontScalePercent: 100,
      messageGapPx: 8,
      showTimestamp: true,
      showGuildLabel: true,
      showNpcAvatar: true,
      showNpcLevel: true,
      showNpcLocationAndCoordinates: true,
    };
    const compactAppearance: ChatAppearanceSettings = {
      ...readableAppearance,
      fontScalePercent: 70,
      messageGapPx: 0,
    };
    const { rerender } = render(
      createMessageListElement(
        renderables,
        "guild-1",
        "guild-1",
        readableAppearance,
      ),
    );
    const viewport = screen.getByTestId("chat-scroll-viewport");
    scrollRequests.length = 0;
    rowHeightScale = 0.7;

    rerender(
      createMessageListElement(
        renderables,
        "guild-1",
        "guild-1",
        compactAppearance,
      ),
    );
    flushAnimationFrames(3);

    expect(scrollRequests.some(({ behavior }) => behavior === "smooth")).toBe(
      false,
    );
    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(120);
  });

  it("preserves the first visible row and offset during appearance reflow", () => {
    const renderables = createRenderables(120);
    const readableAppearance: ChatAppearanceSettings = {
      npcLayout: "tile",
      fontScalePercent: 100,
      messageGapPx: 8,
      showTimestamp: true,
      showGuildLabel: true,
      showNpcAvatar: true,
      showNpcLevel: true,
      showNpcLocationAndCoordinates: true,
    };
    const compactAppearance: ChatAppearanceSettings = {
      ...readableAppearance,
      fontScalePercent: 70,
      messageGapPx: 2,
    };
    const { rerender } = render(
      createMessageListElement(
        renderables,
        "guild-1",
        "guild-1",
        readableAppearance,
      ),
    );
    const viewport = screen.getByTestId("chat-scroll-viewport");
    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 1_000;
    fireEvent.scroll(viewport);
    const anchoredRow = getFirstVisibleRow();
    const anchoredKey = anchoredRow?.dataset.chatRowKey;
    const anchoredOffset = anchoredRow?.getBoundingClientRect().top;
    expect(anchoredKey).toBeDefined();
    rowHeightScale = 0.7;

    rerender(
      createMessageListElement(
        renderables,
        "guild-1",
        "guild-1",
        compactAppearance,
      ),
    );
    flushAnimationFrames(3);

    const restoredRow = screen
      .getAllByRole("listitem")
      .find((row) => row.dataset.chatRowKey === anchoredKey);
    expect(restoredRow?.getBoundingClientRect().top).toBeCloseTo(
      anchoredOffset ?? 0,
    );
  });

  it("preserves history when content above the anchor changes height", () => {
    renderMessageList(createRenderables(120));
    const viewport = screen.getByTestId("chat-scroll-viewport");
    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 1_000;
    fireEvent.scroll(viewport);
    const anchoredRow = getFirstVisibleRow();
    const anchoredKey = anchoredRow?.dataset.chatRowKey;
    const anchoredOffset = anchoredRow?.getBoundingClientRect().top;
    expect(anchoredKey).toBeDefined();
    rowHeightOverrides.set("message-0", 58);

    triggerMessageListResize();
    flushAnimationFrames(2);

    const restoredRow = screen
      .getAllByRole("listitem")
      .find((row) => row.dataset.chatRowKey === anchoredKey);
    expect(restoredRow?.getBoundingClientRect().top).toBeCloseTo(
      anchoredOffset ?? 0,
    );
  });

  it.each([
    [
      "mouse wheel",
      (viewport: HTMLElement) => fireEvent.wheel(viewport, { deltaY: -100 }),
    ],
    ["touch", (viewport: HTMLElement) => fireEvent.touchStart(viewport)],
    [
      "keyboard",
      (viewport: HTMLElement) => fireEvent.keyDown(viewport, { key: "PageUp" }),
    ],
    [
      "scrollbar thumb",
      (viewport: HTMLElement) => fireEvent.pointerDown(viewport),
    ],
  ])(
    "keeps history frozen after %s input moves beyond 72 px",
    (_inputMethod, registerIntent) => {
      const initialRenderables = createRenderables(120);
      const { rerender } = renderMessageList(initialRenderables);
      const viewport = screen.getByTestId("chat-scroll-viewport");
      const historyScrollTop =
        viewport.scrollHeight - viewport.clientHeight - 73;

      registerIntent(viewport);
      viewport.scrollTop = historyScrollTop;
      fireEvent.scroll(viewport);
      scrollRequests.length = 0;

      rerender(createMessageListElement(createRenderables(121)));

      expect(viewport.scrollTop).toBe(historyScrollTop);
      expect(screen.queryByTestId("message-120")).not.toBeInTheDocument();
      expect(scrollRequests).toHaveLength(0);
    },
  );

  it("continues following inside the 72 px bottom zone", () => {
    const initialRenderables = createRenderables(120);
    const { rerender } = renderMessageList(initialRenderables);
    const viewport = screen.getByTestId("chat-scroll-viewport");

    fireEvent.wheel(viewport, { deltaY: -72 });
    viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight - 72;
    fireEvent.scroll(viewport);

    rerender(createMessageListElement(createRenderables(121)));

    expect(screen.getByTestId("message-120")).toBeInTheDocument();
    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
  });

  it("shows updates to an existing party gathering while reading history", () => {
    const initialRenderables = createRenderables(120);
    const initialGathering = initialRenderables[0];
    if (!initialGathering || initialGathering.kind !== "message") {
      throw new Error("Expected the first renderable to be a message");
    }
    initialRenderables[0] = {
      ...initialGathering,
      message: {
        ...initialGathering.message,
        message: "Gathering open",
        partyGathering: {
          discordId: "organizer-1",
          notificationId: "gathering-1",
          world: "tempest",
        },
      },
    };
    const { rerender } = renderMessageList(initialRenderables);
    const viewport = screen.getByTestId("chat-scroll-viewport");
    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    expect(screen.getByRole("button", { name: "Join party" })).toBeVisible();

    const updatedRenderables = initialRenderables.map((renderable) =>
      renderable.kind === "message" && renderable.key === "message-0"
        ? {
            ...renderable,
            message: {
              ...renderable.message,
              message: "Hero zakonczyl zbieranie grupy",
              partyGathering: undefined,
            },
          }
        : renderable,
    );
    rerender(createMessageListElement(updatedRenderables));

    expect(screen.getByText("Hero zakonczyl zbieranie grupy")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Join party" }),
    ).not.toBeInTheDocument();
    expect(viewport.scrollTop).toBe(0);
  });

  it("freezes the rendered snapshot when the bounded history evicts an entry", () => {
    const initialRenderables = createRenderables(500);
    const { rerender } = renderMessageList(initialRenderables);
    const viewport = screen.getByTestId("chat-scroll-viewport");
    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 5_000;
    fireEvent.scroll(viewport);
    const anchoredKey = getFirstVisibleRow()?.dataset.chatRowKey;
    expect(anchoredKey).toBeDefined();

    rerender(createMessageListElement(createRenderables(501).slice(1)));

    expect(
      screen
        .getAllByRole("listitem")
        .some((row) => row.dataset.chatRowKey === anchoredKey),
    ).toBe(true);
    expect(screen.queryByTestId("message-500")).not.toBeInTheDocument();
  });

  it("follows consecutive messages at the bottom without smooth animation", () => {
    const initialRenderables = createRenderables(100);
    const { rerender } = renderMessageList(initialRenderables);
    const viewport = screen.getByTestId("chat-scroll-viewport");
    scrollRequests.length = 0;

    rerender(createMessageListElement(createRenderables(101)));
    rerender(createMessageListElement(createRenderables(102)));

    expect(scrollRequests.some(({ behavior }) => behavior === "smooth")).toBe(
      false,
    );
    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
  });

  it("returns to the bottom after sending a message from history", () => {
    const renderables = createRenderables(300);
    const { rerender } = render(
      createMessageListElement(renderables, "guild-1", "guild-1", undefined, 0),
    );
    const viewport = screen.getByTestId("chat-scroll-viewport");
    fireEvent.wheel(viewport, { deltaY: -500 });
    viewport.scrollTop = 100;
    fireEvent.scroll(viewport);
    scrollRequests.length = 0;

    rerender(
      createMessageListElement(renderables, "guild-1", "guild-1", undefined, 1),
    );

    expect(viewport.scrollTop).toBe(
      viewport.scrollHeight - viewport.clientHeight,
    );
    expect(scrollRequests.some(({ behavior }) => behavior === "smooth")).toBe(
      false,
    );
  });

  it("uses one animated controller jump for a replied message", () => {
    renderMessageList(createRenderables(300));
    scrollRequests.length = 0;

    act(() => dispatchChatScrollToMessage("message-0"));

    expect(scrollRequests).toEqual([{ behavior: "smooth", top: 0 }]);
    expect(screen.getByTestId("chat-scroll-viewport").scrollTop).toBe(0);
  });

  it("renders the empty state without a message list", () => {
    renderMessageList([]);

    expect(screen.getByText("No messages")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass(
      "ll:box-border",
      "ll:h-full",
      "ll:items-center",
      "ll:justify-center",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
