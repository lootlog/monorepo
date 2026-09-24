import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";

const resizeObserverCallbacks: Array<() => void> = [];

const resizeObserverObservedElements: Element[] = [];

const mutationObserverCallbacks: Array<() => void> = [];

const initialWindowInnerWidth = window.innerWidth;

const initialWindowInnerHeight = window.innerHeight;

const resizeViewport = async (width: number, height: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
  await act(() => {
    window.dispatchEvent(new Event("resize"));
  });
};

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallbacks.push(() => {
      callback([], this);
    });
  }

  observe(target: Element) {
    resizeObserverObservedElements.push(target);
  }

  unobserve() {}

  disconnect() {}
}

class MutationObserverMock implements MutationObserver {
  takeRecords(): MutationRecord[] {
    return [];
  }
  constructor(private readonly callback: MutationCallback) {
    mutationObserverCallbacks.push(() => {
      this.callback([], this);
    });
  }

  observe() {}

  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.stubGlobal("MutationObserver", MutationObserverMock);

const triggerResizeObservers = async () => {
  await act(() => {
    resizeObserverCallbacks.forEach((callback) => callback());
  });
};

const flushAnimationFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
};

const getWindowElements = (
  container: HTMLElement,
  { requireResizeHandle = true }: { requireResizeHandle?: boolean } = {},
) => {
  const windowElement = container.querySelector("#ll-notifications");

  if (!(windowElement instanceof HTMLDivElement)) {
    throw new Error("Expected draggable window root");
  }

  const windowBody = windowElement.firstElementChild;
  const contentElement = windowBody?.querySelector(".ll\\:flex-1");
  const titleBarElement = windowBody?.firstElementChild;

  const resizeHandle = container.querySelector(
    "[data-ll-window-resize-handle]",
  );

  if (!(windowBody instanceof HTMLDivElement)) {
    throw new Error("Expected draggable window body");
  }

  if (!(contentElement instanceof HTMLDivElement)) {
    throw new Error("Expected draggable window content");
  }

  if (!(titleBarElement instanceof HTMLDivElement)) {
    throw new Error("Expected draggable window title bar wrapper");
  }

  if (requireResizeHandle && !(resizeHandle instanceof HTMLButtonElement)) {
    throw new Error("Expected resize handle");
  }

  return {
    windowElement,
    windowBody,
    titleBarElement,
    contentElement,
    resizeHandle:
      resizeHandle instanceof HTMLButtonElement ? resizeHandle : null,
  };
};

const getMaxHeightPreviewOverlay = (container: HTMLElement) => {
  return container.querySelector("[data-ll-max-height-preview]");
};

describe("DraggableWindow", () => {
  beforeEach(() => {
    resizeObserverCallbacks.length = 0;
    resizeObserverObservedElements.length = 0;
    mutationObserverCallbacks.length = 0;
    useWindowsStore.setState((state) => ({
      ...state,
      notifications: {
        ...state.notifications,
        position: { x: 0, y: 0 },
        size: { width: 360, height: 300 },
      },
      windowFocusHistory: [],
    }));
  });

  afterEach(() => {
    cleanup();
    resizeObserverCallbacks.length = 0;
    resizeObserverObservedElements.length = 0;
    mutationObserverCallbacks.length = 0;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: initialWindowInnerWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: initialWindowInnerHeight,
    });
  });

  it("contains layout and style invalidation within each overlay window", () => {
    const { container } = render(
      <DraggableWindow isOpen id="notifications" title="Powiadomienia">
        <div>Treść</div>
      </DraggableWindow>,
    );

    const { windowElement } = getWindowElements(container);

    expect(windowElement.style.contain).toBe("layout style");
  });

  it("animates the visual surface and disables interaction during exit", async () => {
    const { container, rerender } = render(
      <DraggableWindow isOpen id="notifications" title="Powiadomienia">
        <div>Treść</div>
      </DraggableWindow>,
    );

    const { windowBody, windowElement } = getWindowElements(container);

    expect(windowBody).toHaveClass("ll-window-preparing");
    expect(windowElement).not.toHaveClass("ll-window-enter");
    expect(windowElement.style.transform).toBe("");

    await flushAnimationFrame();

    expect(windowBody).toHaveClass("ll-window-enter");
    expect(windowBody).not.toHaveClass("ll-window-preparing");

    fireEvent.animationEnd(windowBody, { animationName: "ll-window-enter" });

    expect(windowBody).not.toHaveClass("ll-window-enter");

    rerender(
      <DraggableWindow isOpen={false} id="notifications" title="Powiadomienia">
        <div>Treść</div>
      </DraggableWindow>,
    );

    expect(windowBody).toHaveClass("ll-window-exit");
    expect(windowElement).toHaveAttribute("aria-hidden", "true");
    expect(windowElement.style.pointerEvents).toBe("none");

    fireEvent.animationEnd(windowBody, { animationName: "unrelated" });

    expect(
      container.querySelector('[data-ll-draggable-window="notifications"]'),
    ).toBeInTheDocument();

    fireEvent.animationEnd(screen.getByText("Treść"));

    expect(
      container.querySelector('[data-ll-draggable-window="notifications"]'),
    ).toBeInTheDocument();

    fireEvent.animationEnd(windowBody, { animationName: "ll-window-exit" });

    expect(
      container.querySelector('[data-ll-draggable-window="notifications"]'),
    ).toBeNull();
  });

  it("finishes an entry animation when Chromium cancels its CSS timeline", async () => {
    const { container } = render(
      <DraggableWindow isOpen id="notifications" title="Powiadomienia">
        <div>TreĹ›Ä‡</div>
      </DraggableWindow>,
    );

    const { windowBody } = getWindowElements(container);
    await flushAnimationFrame();

    const animationCancelEvent = new Event("animationcancel", {
      bubbles: true,
    });

    Object.defineProperty(animationCancelEvent, "animationName", {
      value: "ll-window-enter",
    });
    act(() => windowBody.dispatchEvent(animationCancelEvent));

    expect(windowBody).not.toHaveClass("ll-window-enter");
  });

  it("fits width to changing content and caps it at the viewport", async () => {
    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        minWidth={250}
        minHeight={56}
        widthMode="fit-content"
        resizable={false}
      >
        <div className="ll:w-max">Treść</div>
      </DraggableWindow>,
    );

    const { windowElement, windowBody, contentElement } = getWindowElements(
      container,
      { requireResizeHandle: false },
    );

    const contentRoot = contentElement.firstElementChild;

    if (!(contentRoot instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window content root");
    }

    Object.defineProperty(windowBody, "offsetWidth", {
      configurable: true,
      value: 250,
    });
    Object.defineProperty(contentElement, "clientWidth", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(contentRoot, "scrollWidth", {
      configurable: true,
      value: 320,
    });

    await triggerResizeObservers();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.width).toBe("330px");
    });

    Object.defineProperty(contentRoot, "scrollWidth", {
      configurable: true,
      value: 180,
    });
    await triggerResizeObservers();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.width).toBe("250px");
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(contentRoot, "scrollWidth", {
      configurable: true,
      value: 500,
    });
    window.dispatchEvent(new Event("resize"));
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.width).toBe("300px");
    });
    expect(
      container.querySelector("[data-ll-window-resize-handle]"),
    ).toBeNull();
  });

  it("sizes auto height with CSS up to the content limit without content observers", () => {
    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        minWidth={242}
        minHeight={64}
        heightMode="auto-up-to-max"
        maxContentHeight={180}
      >
        <div>Treść</div>
      </DraggableWindow>,
    );

    const { windowElement, contentElement } = getWindowElements(container);

    expect(windowElement.style.height).toBe("auto");
    expect(contentElement.style.maxHeight).toBe("180px");
    // Only the frame's own size is observed, for placement and clamping.
    expect(resizeObserverObservedElements).toEqual([windowElement]);
    expect(mutationObserverCallbacks).toHaveLength(0);
  });

  it("resizes only width when auto height mode is not armed", async () => {
    const handleMaxContentHeightChange = vi.fn<(height: number) => void>();

    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
        maxContentHeight={80}
        onMaxContentHeightChange={handleMaxContentHeightChange}
      >
        <div>Treść</div>
      </DraggableWindow>,
    );

    const { windowElement, resizeHandle } = getWindowElements(container);

    if (!(resizeHandle instanceof HTMLButtonElement)) {
      throw new Error("Expected resize handle");
    }

    Object.defineProperty(windowElement, "offsetWidth", {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(windowElement, "offsetHeight", {
      configurable: true,
      value: 130,
    });

    expect(resizeHandle.style.cursor).toBe("ew-resize");

    fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { buttons: 1, clientX: 140, clientY: 140 });

    expect(getMaxHeightPreviewOverlay(container)).toBeNull();

    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(windowElement.style.width).toBe("400px");
    });

    expect(handleMaxContentHeightChange).not.toHaveBeenCalled();
  });

  it("uses the resize handle to update max content height when armed and keeps width resizable", async () => {
    const handleMaxContentHeightChange = vi.fn<(height: number) => void>();
    const handleArmedChange = vi.fn<(armed: boolean) => void>();

    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
        maxContentHeight={80}
        isMaxHeightAdjustmentArmed
        onMaxContentHeightChange={handleMaxContentHeightChange}
        onMaxHeightAdjustmentArmedChange={handleArmedChange}
      >
        <div>Treść</div>
      </DraggableWindow>,
    );

    const {
      windowElement,
      windowBody,
      titleBarElement,
      contentElement,
      resizeHandle,
    } = getWindowElements(container);

    if (!(resizeHandle instanceof HTMLButtonElement)) {
      throw new Error("Expected resize handle");
    }

    const contentRoot = contentElement.firstElementChild;

    if (!(contentRoot instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window content root");
    }

    Object.defineProperty(windowElement, "offsetWidth", {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(windowElement, "offsetHeight", {
      configurable: true,
      value: 130,
    });
    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      value: 130,
    });
    Object.defineProperty(titleBarElement, "offsetHeight", {
      configurable: true,
      value: 30,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(contentRoot, "scrollHeight", {
      configurable: true,
      value: 60,
    });

    expect(windowBody.className).toContain("ll:ring-1");
    expect(resizeHandle.style.cursor).toBe("se-resize");
    expect(getMaxHeightPreviewOverlay(container)).toBeNull();

    fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

    const previewOverlay = getMaxHeightPreviewOverlay(container);

    if (!(previewOverlay instanceof HTMLDivElement)) {
      throw new Error("Expected max height preview overlay");
    }

    expect(windowElement.style.height).toBe("110px");
    expect(previewOverlay.children[1]).toHaveStyle({ top: "60px" });
    expect(previewOverlay.children[2]).toHaveStyle({ top: "79px" });

    fireEvent.mouseMove(document, { buttons: 1, clientX: 140, clientY: 140 });
    await flushAnimationFrame();

    expect(getMaxHeightPreviewOverlay(container)).not.toBeNull();
    expect(windowElement.style.height).toBe("170px");
    expect(handleMaxContentHeightChange).not.toHaveBeenCalled();

    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(windowElement.style.width).toBe("400px");
    });

    expect(getMaxHeightPreviewOverlay(container)).toBeNull();
    expect(handleMaxContentHeightChange).toHaveBeenCalledWith(140);
    expect(handleArmedChange).toHaveBeenCalledWith(false);
  });

  it("shows a locked window on-screen in a smaller viewport and restores its saved position without rewriting it", async () => {
    await resizeViewport(1600, 1000);
    useWindowsStore.setState((state) => ({
      timers: {
        ...state.timers,
        position: { x: 900, y: 600 },
        hasDefinedPosition: true,
        size: { width: 242, height: 240 },
        locked: true,
      },
    }));

    const { container } = render(
      <DraggableWindow isOpen id="timers" title="Timery">
        <div>Treść</div>
      </DraggableWindow>,
    );

    const windowElement = container.querySelector("#ll-timers");

    expect(windowElement).toHaveStyle({ left: "900px", top: "600px" });

    await resizeViewport(800, 600);

    await waitFor(() => {
      expect(windowElement).toHaveStyle({ left: "558px", top: "360px" });
    });
    expect(useWindowsStore.getState().timers.position).toEqual({
      x: 900,
      y: 600,
    });

    await resizeViewport(1600, 1000);

    await waitFor(() => {
      expect(windowElement).toHaveStyle({ left: "900px", top: "600px" });
    });
  });

  it("closes on Escape only while focus is inside the window and keeps the key from the game", () => {
    const onClose = vi.fn<() => void>();
    const gameKeyDown = vi.fn<(event: KeyboardEvent) => void>();
    document.addEventListener("keydown", gameKeyDown);
    const outside = document.createElement("button");
    document.body.append(outside);

    try {
      render(
        <DraggableWindow
          isOpen
          id="notifications"
          title="Powiadomienia"
          onClose={onClose}
        >
          <button type="button">Wewnątrz</button>
        </DraggableWindow>,
      );

      fireEvent.keyDown(outside, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
      expect(gameKeyDown).toHaveBeenCalledOnce();

      fireEvent.keyDown(screen.getByRole("button", { name: "Wewnątrz" }), {
        key: "Escape",
      });
      expect(onClose).toHaveBeenCalledOnce();
      expect(gameKeyDown).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener("keydown", gameKeyDown);
      outside.remove();
    }
  });

  it("takes focus only when the player opens it and returns focus on close", async () => {
    useSettingsStore.setState({ animationEffectsEnabled: false });
    useWindowsStore.setState((state) => ({
      timers: { ...state.timers, open: false },
      "npc-detector": { ...state["npc-detector"], open: false },
      focusRequest: undefined,
    }));

    const StoreWindow = ({ id }: { id: "timers" | "npc-detector" }) => {
      const open = useWindowsStore((state) => state[id].open);

      return (
        <DraggableWindow
          isOpen={open}
          id={id}
          title={id}
          onClose={() => useWindowsStore.getState().setOpen(id, false)}
        >
          <div>Treść</div>
        </DraggableWindow>
      );
    };

    const chatInput = document.createElement("input");
    document.body.append(chatInput);

    try {
      render(
        <>
          <StoreWindow id="timers" />
          <StoreWindow id="npc-detector" />
        </>,
      );

      chatInput.focus();
      await act(() => {
        useWindowsStore.getState().setOpen("npc-detector", true);
      });
      expect(document.querySelector("#ll-npc-detector")).toBeInTheDocument();
      expect(chatInput).toHaveFocus();

      await act(() => {
        useWindowsStore.getState().toggleOpen("timers");
      });
      expect(document.querySelector("#ll-timers")).toHaveFocus();

      await act(() => {
        useWindowsStore.getState().toggleOpen("timers");
      });
      expect(document.querySelector("#ll-timers")).toBeNull();
      expect(chatInput).toHaveFocus();
    } finally {
      chatInput.remove();
    }
  });
});
