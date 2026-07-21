import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraggableWindow } from "@/components/draggable-window";
import { useWindowsStore } from "@/store/windows.store";

const resizeObserverCallbacks: Array<() => void> = [];
const resizeObserverObservedElements: Element[] = [];
const mutationObserverCallbacks: Array<() => void> = [];
const initialWindowInnerWidth = window.innerWidth;

class ResizeObserverMock {
  constructor(private readonly callback: () => void) {
    resizeObserverCallbacks.push(callback);
  }

  observe(target: Element) {
    resizeObserverObservedElements.push(target);
  }

  unobserve() {}

  disconnect() {}
}

class MutationObserverMock {
  constructor(private readonly callback: MutationCallback) {
    mutationObserverCallbacks.push(() => {
      this.callback([], this as unknown as MutationObserver);
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

const triggerMutationObservers = async () => {
  await act(() => {
    mutationObserverCallbacks.forEach((callback) => callback());
  });
};

const flushAnimationFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
};

const mockElementRenderedHeight = (element: HTMLElement, height: number) => {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      width: 0,
      height,
      top: 0,
      right: 0,
      bottom: height,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
};

const createScrollAreaChildren = () => (
  <div className="ll:flex ll:h-full ll:w-full ll:flex-col ll:overflow-hidden">
    <div data-ll-native-scroll-area="">
      <div>
        <div>Treść</div>
      </div>
    </div>
  </div>
);

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

  if (requireResizeHandle && !(resizeHandle instanceof HTMLDivElement)) {
    throw new Error("Expected resize handle");
  }

  return {
    windowElement,
    windowBody,
    titleBarElement,
    contentElement,
    resizeHandle: resizeHandle instanceof HTMLDivElement ? resizeHandle : null,
  };
};

const getNestedScrollAreaElements = (container: HTMLElement) => {
  const { windowElement, windowBody, titleBarElement, contentElement } =
    getWindowElements(container, { requireResizeHandle: false });
  const viewportElement = container.querySelector(
    "[data-ll-native-scroll-area]",
  );
  const viewportContent = viewportElement?.firstElementChild;
  const measuredContentElement = viewportContent?.firstElementChild;

  if (!(viewportElement instanceof HTMLDivElement)) {
    throw new Error("Expected scroll area viewport");
  }

  if (!(viewportContent instanceof HTMLDivElement)) {
    throw new Error("Expected scroll area viewport content");
  }

  if (!(measuredContentElement instanceof HTMLDivElement)) {
    throw new Error("Expected measured scroll area content");
  }

  return {
    windowElement,
    windowBody,
    titleBarElement,
    contentElement,
    viewportElement,
    viewportContent,
    measuredContentElement,
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

  it("animates the visual surface and disables interaction during exit", () => {
    const { container, rerender } = render(
      <DraggableWindow isOpen id="notifications" title="Powiadomienia">
        <div>Treść</div>
      </DraggableWindow>,
    );
    const { windowBody, windowElement } = getWindowElements(container);

    expect(windowBody).toHaveClass("ll-window-enter");
    expect(windowElement).not.toHaveClass("ll-window-enter");
    expect(windowElement.style.transform).toBe("");

    fireEvent.animationEnd(windowBody);

    expect(windowBody).not.toHaveClass("ll-window-enter");

    rerender(
      <DraggableWindow isOpen={false} id="notifications" title="Powiadomienia">
        <div>Treść</div>
      </DraggableWindow>,
    );

    expect(windowBody).toHaveClass("ll-window-exit");
    expect(windowElement).toHaveAttribute("aria-hidden", "true");
    expect(windowElement.style.pointerEvents).toBe("none");

    fireEvent.animationEnd(screen.getByText("Treść"));

    expect(
      container.querySelector('[data-ll-draggable-window="notifications"]'),
    ).toBeInTheDocument();

    fireEvent.animationEnd(windowBody);

    expect(
      container.querySelector('[data-ll-draggable-window="notifications"]'),
    ).toBeNull();
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

  it("caps auto height using the provided content limit", async () => {
    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        resizable={false}
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
        maxContentHeight={80}
      >
        <div>Treść</div>
      </DraggableWindow>,
    );

    const { windowElement, windowBody, titleBarElement, contentElement } =
      getWindowElements(container, { requireResizeHandle: false });
    const contentRoot = contentElement.firstElementChild;

    if (!(contentRoot instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window content root");
    }

    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(titleBarElement, "offsetHeight", {
      configurable: true,
      value: 50,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(contentRoot, "scrollHeight", {
      configurable: true,
      value: 160,
    });

    await triggerResizeObservers();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("130px");
    });
  });

  it("uses CSS auto height without content observers", () => {
    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        minWidth={242}
        minHeight={64}
        heightMode="css-auto-up-to-max"
        maxContentHeight={180}
      >
        <div>Treść</div>
      </DraggableWindow>,
    );
    const { windowElement, contentElement } = getWindowElements(container);

    expect(windowElement.style.height).toBe("auto");
    expect(contentElement.style.maxHeight).toBe("180px");
    expect(resizeObserverCallbacks).toHaveLength(0);
    expect(mutationObserverCallbacks).toHaveLength(0);
  });

  it("resizes only width when auto height mode is not armed", async () => {
    const handleMaxContentHeightChange = vi.fn();
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

    if (!(resizeHandle instanceof HTMLDivElement)) {
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
    const handleMaxContentHeightChange = vi.fn();
    const handleArmedChange = vi.fn();

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

    if (!(resizeHandle instanceof HTMLDivElement)) {
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

  it("measures nested scroll area content and grows with a larger max content height", async () => {
    const { container, rerender } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        resizable={false}
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
        maxContentHeight={80}
      >
        {createScrollAreaChildren()}
      </DraggableWindow>,
    );

    const {
      windowElement,
      windowBody,
      titleBarElement,
      contentElement,
      viewportElement,
      viewportContent,
      measuredContentElement,
    } = getNestedScrollAreaElements(container);

    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(titleBarElement, "offsetHeight", {
      configurable: true,
      value: 50,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(measuredContentElement, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    Object.defineProperty(viewportContent, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    Object.defineProperty(viewportElement, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    mockElementRenderedHeight(viewportContent, 160);

    await triggerResizeObservers();
    await flushAnimationFrame();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("130px");
    });

    expect(resizeObserverObservedElements).toEqual(
      expect.arrayContaining([viewportElement, viewportContent]),
    );

    rerender(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        resizable={false}
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
        maxContentHeight={180}
      >
        {createScrollAreaChildren()}
      </DraggableWindow>,
    );

    const rerenderedElements = getNestedScrollAreaElements(container);

    Object.defineProperty(rerenderedElements.windowBody, "offsetHeight", {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(rerenderedElements.titleBarElement, "offsetHeight", {
      configurable: true,
      value: 50,
    });
    Object.defineProperty(rerenderedElements.contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(
      rerenderedElements.measuredContentElement,
      "scrollHeight",
      {
        configurable: true,
        value: 160,
      },
    );
    Object.defineProperty(rerenderedElements.viewportContent, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    Object.defineProperty(rerenderedElements.viewportElement, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    mockElementRenderedHeight(rerenderedElements.viewportContent, 160);

    await triggerMutationObservers();
    await triggerResizeObservers();
    await flushAnimationFrame();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("210px");
    });
  });

  it("does not undershoot nested scroll area height when rendered content uses fractional pixels", async () => {
    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        resizable={false}
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
        maxContentHeight={180}
      >
        {createScrollAreaChildren()}
      </DraggableWindow>,
    );

    const {
      windowElement,
      windowBody,
      titleBarElement,
      contentElement,
      viewportElement,
      viewportContent,
      measuredContentElement,
    } = getNestedScrollAreaElements(container);

    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(titleBarElement, "offsetHeight", {
      configurable: true,
      value: 50,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(measuredContentElement, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    Object.defineProperty(viewportContent, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    Object.defineProperty(viewportElement, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    mockElementRenderedHeight(viewportContent, 159.2);

    await triggerResizeObservers();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("210px");
    });
  });

  it("does not undershoot nested scroll area height while the window opening scale transform is active", async () => {
    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        resizable={false}
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
        maxContentHeight={180}
      >
        {createScrollAreaChildren()}
      </DraggableWindow>,
    );

    const {
      windowElement,
      windowBody,
      titleBarElement,
      contentElement,
      viewportElement,
      viewportContent,
      measuredContentElement,
    } = getNestedScrollAreaElements(container);

    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(titleBarElement, "offsetHeight", {
      configurable: true,
      value: 50,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(measuredContentElement, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    Object.defineProperty(viewportContent, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    Object.defineProperty(viewportElement, "scrollHeight", {
      configurable: true,
      value: 160,
    });
    mockElementRenderedHeight(viewportContent, 158);

    await triggerResizeObservers();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("210px");
    });
  });

  it("shrinks with the content when nested scroll area content gets smaller", async () => {
    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        resizable={false}
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
        maxContentHeight={180}
      >
        {createScrollAreaChildren()}
      </DraggableWindow>,
    );

    const {
      windowElement,
      windowBody,
      titleBarElement,
      contentElement,
      viewportElement,
      viewportContent,
      measuredContentElement,
    } = getNestedScrollAreaElements(container);

    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(titleBarElement, "offsetHeight", {
      configurable: true,
      value: 50,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(measuredContentElement, "scrollHeight", {
      configurable: true,
      writable: true,
      value: 160,
    });
    Object.defineProperty(viewportContent, "scrollHeight", {
      configurable: true,
      writable: true,
      value: 160,
    });
    Object.defineProperty(viewportElement, "scrollHeight", {
      configurable: true,
      writable: true,
      value: 160,
    });
    mockElementRenderedHeight(viewportContent, 160);

    await triggerResizeObservers();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("210px");
    });

    Object.defineProperty(measuredContentElement, "scrollHeight", {
      configurable: true,
      writable: true,
      value: 60,
    });
    Object.defineProperty(viewportContent, "scrollHeight", {
      configurable: true,
      writable: true,
      value: 160,
    });
    Object.defineProperty(viewportElement, "scrollHeight", {
      configurable: true,
      writable: true,
      value: 160,
    });
    mockElementRenderedHeight(viewportContent, 60);

    await triggerResizeObservers();
    await flushAnimationFrame();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("110px");
    });
  });

  it("does not overshoot height when content growth temporarily lags behind the window body resize", async () => {
    const { container } = render(
      <DraggableWindow
        isOpen
        id="notifications"
        title="Powiadomienia"
        minWidth={242}
        minHeight={88}
        heightMode="auto-up-to-max"
      >
        <div>Treść</div>
      </DraggableWindow>,
    );

    const { windowElement, windowBody, titleBarElement, contentElement } =
      getWindowElements(container, {
        requireResizeHandle: false,
      });
    const contentRoot = contentElement.firstElementChild;

    if (!(contentRoot instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window content root");
    }

    Object.defineProperty(titleBarElement, "offsetHeight", {
      configurable: true,
      value: 50,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      writable: true,
      value: 60,
    });
    Object.defineProperty(contentRoot, "scrollHeight", {
      configurable: true,
      writable: true,
      value: 60,
    });
    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      writable: true,
      value: 110,
    });

    await triggerResizeObservers();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("110px");
    });

    Object.defineProperty(contentRoot, "scrollHeight", {
      configurable: true,
      writable: true,
      value: 80,
    });
    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      writable: true,
      value: 180,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      writable: true,
      value: 60,
    });

    await triggerResizeObservers();

    await waitFor(() => {
      expect(windowElement.style.height).toBe("130px");
    });
  });
});
