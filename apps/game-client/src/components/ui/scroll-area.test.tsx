import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, type PointerEventHandler } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollArea } from "./scroll-area";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ScrollArea", () => {
  it("keeps root props separate from the scrollable viewport", () => {
    const viewportRef = createRef<HTMLDivElement>();

    const { container } = render(
      <ScrollArea
        ref={viewportRef}
        className="ll:max-h-40"
        data-testid="root"
        viewportStyle={{ overflowAnchor: "none" }}
      >
        Content
      </ScrollArea>,
    );

    const root = screen.getByTestId("root");
    const viewport = container.querySelector("[data-ll-scroll-area-viewport]");

    expect(root).toHaveClass("ll:max-h-40");
    expect(viewport).toBeInstanceOf(HTMLDivElement);
    expect(viewportRef.current).toBe(viewport);
    expect(viewport).toHaveStyle({ overflowAnchor: "none" });
    expect(viewport).toHaveTextContent("Content");
  });

  it("constrains vertical content to the viewport width", () => {
    const { container } = render(<ScrollArea>Content</ScrollArea>);
    const viewport = container.querySelector("[data-ll-scroll-area-viewport]");
    const content = viewport?.firstElementChild;

    expect(content).toHaveStyle({ width: "100%", minWidth: 0 });
  });

  it.each(["horizontal", "both"] as const)(
    "lets %s content expand to expose horizontal overflow",
    (orientation) => {
      const { container } = render(
        <ScrollArea orientation={orientation}>Content</ScrollArea>,
      );

      const viewport = container.querySelector(
        "[data-ll-scroll-area-viewport]",
      );

      const content = viewport?.firstElementChild;

      expect(content).toHaveStyle({ minWidth: "fit-content" });
      expect(content).not.toHaveStyle({ width: "100%" });
    },
  );

  it("renders overlay scrollbars and overflow for the selected orientation", async () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);

    const { container, rerender } = render(
      <ScrollArea data-testid="root" orientation="horizontal">
        <div className="ll:w-[500px]">Content</div>
      </ScrollArea>,
    );

    const root = screen.getByTestId("root");
    const viewport = container.querySelector("[data-ll-scroll-area-viewport]");

    await waitFor(() => {
      expect(
        Array.from(root.children).find(
          (element) =>
            element.getAttribute("data-orientation") === "horizontal",
        ),
      ).toBeDefined();
    });

    expect(viewport).toHaveStyle({
      overflowX: "scroll",
      overflowY: "hidden",
    });

    rerender(
      <ScrollArea data-testid="root" orientation="both">
        Content
      </ScrollArea>,
    );

    await waitFor(() => {
      const elements = Array.from(root.children).filter((element) =>
        element.hasAttribute("data-orientation"),
      );

      expect(elements).toHaveLength(2);
    });

    expect(viewport).toHaveStyle({
      overflowX: "scroll",
      overflowY: "scroll",
    });
  });

  it("uses a vertical mouse wheel to move horizontal content", () => {
    const { container } = render(
      <ScrollArea orientation="horizontal">Content</ScrollArea>,
    );

    const viewport = container.querySelector("[data-ll-scroll-area-viewport]");

    if (!(viewport instanceof HTMLDivElement))
      throw new Error("Missing scroll viewport");
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 100 },
      scrollLeft: { configurable: true, value: 0, writable: true },
      scrollWidth: { configurable: true, value: 300 },
    });
    const wasNotCanceled = fireEvent.wheel(viewport, { deltaY: 48 });

    expect(viewport.scrollLeft).toBe(48);
    expect(wasNotCanceled).toBe(false);
  });

  it("lets wheel events escape when horizontal content is at an edge", () => {
    const { container } = render(
      <ScrollArea orientation="horizontal">Content</ScrollArea>,
    );

    const viewport = container.querySelector("[data-ll-scroll-area-viewport]");

    if (!(viewport instanceof HTMLDivElement))
      throw new Error("Missing scroll viewport");
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 100 },
      scrollLeft: { configurable: true, value: 0, writable: true },
      scrollWidth: { configurable: true, value: 300 },
    });

    expect(fireEvent.wheel(viewport, { deltaY: -48 })).toBe(true);
    expect(viewport.scrollLeft).toBe(0);

    viewport.scrollLeft = 200;
    expect(fireEvent.wheel(viewport, { deltaY: 48 })).toBe(true);
    expect(viewport.scrollLeft).toBe(200);
  });

  it("leaves horizontally dominant touchpad gestures to native scrolling", () => {
    const { container } = render(
      <ScrollArea orientation="horizontal">Content</ScrollArea>,
    );

    const viewport = container.querySelector("[data-ll-scroll-area-viewport]");

    if (!(viewport instanceof HTMLDivElement))
      throw new Error("Missing scroll viewport");
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 100 },
      scrollLeft: { configurable: true, value: 0, writable: true },
      scrollWidth: { configurable: true, value: 300 },
    });

    expect(fireEvent.wheel(viewport, { deltaX: 48, deltaY: 12 })).toBe(true);
    expect(viewport.scrollLeft).toBe(0);
  });

  it("does not start a parent drag from the overlay scrollbar", async () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(100);
    const onParentPointerDown = vi.fn<PointerEventHandler<HTMLDivElement>>();

    render(
      <div onPointerDown={onParentPointerDown}>
        <ScrollArea data-testid="root">Content</ScrollArea>
      </div>,
    );

    const root = screen.getByTestId("root");

    const scrollbar = await waitFor(() => {
      const element = Array.from(root.children).find(
        (child) => child.getAttribute("data-orientation") === "vertical",
      );

      expect(element).toBeDefined();

      if (!(element instanceof HTMLElement))
        throw new Error("Missing scrollbar");

      return element;
    });

    fireEvent.pointerDown(scrollbar, { button: 0, clientY: 20 });

    expect(onParentPointerDown).not.toHaveBeenCalled();
  });
});
