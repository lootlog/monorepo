import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDrag } from "./use-drag";

describe("useDrag", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not install pointer-session listeners while idle", () => {
    const documentAddEventListener = vi.spyOn(document, "addEventListener");
    const windowAddEventListener = vi.spyOn(window, "addEventListener");
    const element = document.createElement("div");
    const ref = { current: element } as RefObject<HTMLDivElement | null>;

    renderHook(() => useDrag({ ref, onDragStop: vi.fn() }));

    const documentEventNames = documentAddEventListener.mock.calls.map(
      ([eventName]) => eventName,
    );
    const windowEventNames = windowAddEventListener.mock.calls.map(
      ([eventName]) => eventName,
    );
    expect(documentEventNames).not.toContain("pointermove");
    expect(documentEventNames).not.toContain("pointerup");
    expect(documentEventNames).not.toContain("pointercancel");
    expect(documentEventNames).not.toContain("pointerdown");
    expect(windowEventNames).not.toContain("blur");
  });

  it("installs and removes session listeners around an active drag", () => {
    const documentAddEventListener = vi.spyOn(document, "addEventListener");
    const documentRemoveEventListener = vi.spyOn(
      document,
      "removeEventListener",
    );
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const ref = { current: element } as RefObject<HTMLDivElement | null>;
    const { result, unmount } = renderHook(() =>
      useDrag({ ref, onDragStop: vi.fn() }),
    );
    documentAddEventListener.mockClear();

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        clientX: 10,
        clientY: 10,
        isPrimary: true,
        pointerId: 1,
        pointerType: "mouse",
        stopPropagation: vi.fn(),
        target: element,
      } as unknown as ReactPointerEvent<HTMLElement>);
    });
    expect(element.style.willChange).toBe("transform");

    expect(
      documentAddEventListener.mock.calls.map(([eventName]) => eventName),
    ).toContain("pointermove");
    unmount();
    expect(
      documentRemoveEventListener.mock.calls.map(([eventName]) => eventName),
    ).toContain("pointermove");
  });

  it("moves with a coalesced transform and commits the position on drag end", () => {
    let scheduledFrame: FrameRequestCallback | null = null;
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        scheduledFrame = callback;
        return 1;
      });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      () => undefined,
    );
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const ref = { current: element } as RefObject<HTMLDivElement | null>;
    const onDragStop = vi.fn();
    const { result } = renderHook(() => useDrag({ ref, onDragStop }));

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        clientX: 10,
        clientY: 10,
        isPrimary: true,
        pointerId: 1,
        pointerType: "mouse",
        stopPropagation: vi.fn(),
        target: element,
      } as unknown as ReactPointerEvent<HTMLElement>);
    });

    act(() => {
      for (let index = 0; index < 20; index += 1) {
        document.dispatchEvent(
          Object.assign(new Event("pointermove"), {
            buttons: 1,
            clientX: 20 + index,
            clientY: 30 + index,
            pointerId: 1,
            pointerType: "mouse",
          }),
        );
      }
    });

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(result.current.position).toEqual({ x: 0, y: 0 });

    act(() => {
      scheduledFrame?.(16);
    });

    expect(result.current.position).toEqual({ x: 0, y: 0 });
    expect(element.style.transform).toBe("translate3d(29px, 39px, 0)");

    act(() => {
      document.dispatchEvent(
        Object.assign(new Event("pointerup"), { pointerId: 1 }),
      );
    });

    expect(result.current.position).toEqual({ x: 29, y: 39 });
    expect(element.style.transform).toBe("");
    expect(element.style.willChange).toBe("");
    expect(onDragStop).toHaveBeenCalledOnce();
    expect(onDragStop).toHaveBeenCalledWith({ x: 29, y: 39 });
  });

  it("ignores another pointer and ends the active session on pointer cancel", () => {
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const onDragStop = vi.fn();
    const ref = { current: element } as RefObject<HTMLDivElement | null>;
    const { result } = renderHook(() => useDrag({ ref, onDragStop }));

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        clientX: 10,
        clientY: 10,
        isPrimary: true,
        pointerId: 7,
        pointerType: "mouse",
        stopPropagation: vi.fn(),
        target: element,
      } as unknown as ReactPointerEvent<HTMLElement>);
    });

    act(() => {
      document.dispatchEvent(
        Object.assign(new Event("pointercancel"), { pointerId: 8 }),
      );
    });
    expect(result.current.isDragging).toBe(true);
    expect(onDragStop).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(
        Object.assign(new Event("pointercancel"), { pointerId: 7 }),
      );
    });
    expect(result.current.isDragging).toBe(false);
    expect(onDragStop).toHaveBeenCalledOnce();
    expect(onDragStop).toHaveBeenCalledWith({ x: 0, y: 0 });
  });
});
