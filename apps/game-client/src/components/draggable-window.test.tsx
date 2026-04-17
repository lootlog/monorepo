import { fireEvent, render, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraggableWindow } from "@/components/draggable-window";
import { useWindowsStore } from "@/store/windows.store";

const resizeObserverCallbacks: Array<() => void> = [];

class ResizeObserverMock {
  constructor(private readonly callback: () => void) {
    resizeObserverCallbacks.push(callback);
  }

  observe() {}

  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("DraggableWindow", () => {
  beforeEach(() => {
    resizeObserverCallbacks.length = 0;
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

  it("caps auto height using the provided content limit", async () => {
    const { container } = render(
      <DraggableWindow
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

    const windowElement = container.querySelector("#ll-notifications");

    if (!(windowElement instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window root");
    }

    const windowBody = windowElement.firstElementChild;
    const contentElement = windowBody?.querySelector(".ll\\:flex-1");

    if (!(windowBody instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window body");
    }

    if (!(contentElement instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window content");
    }

    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(contentElement, "scrollHeight", {
      configurable: true,
      value: 160,
    });

    await act(async () => {
      resizeObserverCallbacks.forEach((callback) => callback());
    });

    await waitFor(() => {
      expect(windowElement.style.height).toBe("130px");
    });
  });

  it("uses the resize handle to update max content height when armed", async () => {
    const handleMaxContentHeightChange = vi.fn();
    const handleArmedChange = vi.fn();

    const { container } = render(
      <DraggableWindow
        id="notifications"
        title="Powiadomienia"
        resizable={false}
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

    const windowElement = container.querySelector("#ll-notifications");

    if (!(windowElement instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window root");
    }

    const windowBody = windowElement.firstElementChild;
    const contentElement = windowBody?.querySelector(".ll\\:flex-1");
    const resizeHandle = container.querySelector(".ll\\:cursor-se-resize");

    if (!(windowBody instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window body");
    }

    if (!(contentElement instanceof HTMLDivElement)) {
      throw new Error("Expected draggable window content");
    }

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
    Object.defineProperty(windowBody, "offsetHeight", {
      configurable: true,
      value: 130,
    });
    Object.defineProperty(contentElement, "clientHeight", {
      configurable: true,
      value: 100,
    });

    fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { buttons: 1, clientX: 100, clientY: 140 });
    fireEvent.mouseUp(document);

    expect(handleMaxContentHeightChange).toHaveBeenCalledWith(140);
    expect(handleArmedChange).toHaveBeenCalledWith(false);
  });
});
