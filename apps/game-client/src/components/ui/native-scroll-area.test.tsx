import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { NativeScrollArea } from "./native-scroll-area";

describe("NativeScrollArea", () => {
  it("exposes a native vertical viewport with hover scrollbars", () => {
    const viewportRef = createRef<HTMLDivElement>();
    const onScroll = vi.fn();

    render(
      <NativeScrollArea
        ref={viewportRef}
        className="ll:max-h-40"
        data-testid="viewport"
        onScroll={onScroll}
        style={{ overflowAnchor: "none" }}
      >
        Content
      </NativeScrollArea>,
    );

    const viewport = screen.getByTestId("viewport");

    expect(viewport.tagName).toBe("DIV");
    expect(viewportRef.current).toBe(viewport);
    expect(viewport).toHaveAttribute("data-ll-native-scroll-area", "");
    expect(viewport).toHaveClass(
      "ll:max-h-40",
      "ll:overflow-y-auto",
      "ll:overflow-x-hidden",
      "ll:scrollbar-thin",
      "ll:scrollbar-gutter-stable",
      "ll:scrollbar-thumb-transparent",
      "ll:scrollbar-track-transparent",
      "ll:hover:scrollbar-thumb-gray-400/50",
      "ll:hover:scrollbar-track-gray-600/60",
    );
    expect(viewport).toHaveStyle({ overflowAnchor: "none" });

    fireEvent.scroll(viewport);
    expect(onScroll).toHaveBeenCalledOnce();
  });

  it("configures horizontal and bidirectional native overflow", () => {
    const { rerender } = render(
      <NativeScrollArea data-testid="viewport" orientation="horizontal" />,
    );

    expect(screen.getByTestId("viewport")).toHaveClass(
      "ll:overflow-x-auto",
      "ll:overflow-y-hidden",
    );
    expect(screen.getByTestId("viewport")).not.toHaveClass(
      "ll:scrollbar-gutter-stable",
    );

    rerender(<NativeScrollArea data-testid="viewport" orientation="both" />);

    expect(screen.getByTestId("viewport")).toHaveClass(
      "ll:overflow-auto",
      "ll:scrollbar-gutter-stable",
    );
  });

  it("keeps the native scrollbar colored when visibility is always", () => {
    render(
      <NativeScrollArea data-testid="viewport" scrollbarVisibility="always" />,
    );

    expect(screen.getByTestId("viewport")).toHaveClass(
      "ll:scrollbar-thumb-gray-400/50",
      "ll:scrollbar-track-gray-600/60",
    );
    expect(screen.getByTestId("viewport")).not.toHaveClass(
      "ll:scrollbar-thumb-transparent",
      "ll:scrollbar-track-transparent",
    );
    expect(screen.getByTestId("viewport")).not.toHaveAttribute(
      "scrollbarVisibility",
    );
  });

  it("prevents parent dragging from the vertical scrollbar gutter only", () => {
    const onParentPointerDown = vi.fn();
    const onViewportPointerDown = vi.fn();

    render(
      <div onPointerDown={onParentPointerDown}>
        <NativeScrollArea
          data-testid="viewport"
          onPointerDown={onViewportPointerDown}
          style={{ border: "2px solid transparent" }}
        >
          <span>Content</span>
        </NativeScrollArea>
      </div>,
    );

    const viewport = screen.getByTestId("viewport");

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 190 },
      offsetWidth: { configurable: true, value: 204 },
    });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      bottom: 304,
      height: 304,
      left: 0,
      right: 204,
      top: 0,
      width: 204,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    });

    fireEvent.pointerDown(viewport, { clientX: 198, clientY: 100 });
    expect(onViewportPointerDown).toHaveBeenCalledOnce();
    expect(onParentPointerDown).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByText("Content"), {
      clientX: 100,
      clientY: 100,
    });
    expect(onViewportPointerDown).toHaveBeenCalledTimes(2);
    expect(onParentPointerDown).toHaveBeenCalledOnce();
  });

  it("prevents parent dragging from a horizontal scrollbar gutter", () => {
    const onParentPointerDown = vi.fn();

    render(
      <div onPointerDown={onParentPointerDown}>
        <NativeScrollArea
          data-testid="viewport"
          orientation="horizontal"
          style={{ border: "2px solid transparent" }}
        />
      </div>,
    );

    const viewport = screen.getByTestId("viewport");

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 190 },
      offsetHeight: { configurable: true, value: 204 },
    });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      bottom: 204,
      height: 204,
      left: 0,
      right: 300,
      top: 0,
      width: 300,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    });

    fireEvent.pointerDown(viewport, { clientX: 100, clientY: 198 });
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });
});
