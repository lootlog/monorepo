// @vitest-environment happy-dom
import { useRef, useState } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { usePageVirtualizer } from "./use-page-scroll";

const resizeObservers = new Set<TestResizeObserver>();

class TestResizeObserver implements ResizeObserver {
  readonly targets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    resizeObservers.add(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
    resizeObservers.delete(this);
  }

  notify() {
    this.callback(
      Array.from(this.targets, (target) => {
        const contentRect = target.getBoundingClientRect();

        const size = {
          blockSize: contentRect.height,
          inlineSize: contentRect.width,
        };

        return {
          target,
          contentRect,
          borderBoxSize: [size],
          contentBoxSize: [size],
          devicePixelContentBoxSize: [size],
        };
      }),
      this,
    );
  }
}

function VirtualList({ withHeader = false }: { withHeader?: boolean }) {
  "use no memo";

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = usePageVirtualizer<HTMLDivElement>({
    count: 60,
    scrollElement,
    listRef: withHeader ? listRef : undefined,
    estimateSize: () => 100,
    overscan: 0,
  });

  return (
    <div ref={setScrollElement} data-testid="viewport">
      {withHeader && <div style={{ height: 300 }} />}
      <div
        ref={listRef}
        data-testid="list"
        data-header-height={withHeader ? 300 : 0}
        style={{ position: "relative", height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: "absolute",
              top: 0,
              height: 100,
              transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            Row {item.index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(500);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(500);
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(6300);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const viewport = this.closest<HTMLElement>('[data-testid="viewport"]');
      const isList = this.dataset.testid === "list";

      const top = isList
        ? 100 + Number(this.dataset.headerHeight) - (viewport?.scrollTop ?? 0)
        : 100;

      return new DOMRect(0, top, 800, isList ? 6000 : 500);
    },
  );
});

afterEach(() => {
  cleanup();
  resizeObservers.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function scrollTo(viewport: HTMLElement, top: number) {
  act(() => {
    viewport.scrollTop = top;
    fireEvent.scroll(viewport);
  });
}

function resize() {
  act(() => {
    for (const observer of resizeObservers) observer.notify();
  });
}

it("keeps later rows reachable after returning to a scrolled list", () => {
  const firstVisit = render(<VirtualList />);
  const firstViewport = firstVisit.getByTestId("viewport");
  scrollTo(firstViewport, 2500);
  expect(firstVisit.queryByText("Row 26")).not.toBeNull();
  const restoredScrollTop = firstViewport.scrollTop;
  firstVisit.unmount();

  const returnVisit = render(<VirtualList />);
  scrollTo(returnVisit.getByTestId("viewport"), restoredScrollTop);
  resize();

  expect(returnVisit.queryByText("Row 26")).not.toBeNull();
  expect(returnVisit.queryByText("Row 1")).toBeNull();

  scrollTo(returnVisit.getByTestId("viewport"), 5000);
  resize();
  expect(returnVisit.queryByText("Row 51")).not.toBeNull();
});

it("keeps a nested list aligned with its header when the viewport resizes", () => {
  const view = render(<VirtualList withHeader />);
  scrollTo(view.getByTestId("viewport"), 2500);
  resize();

  expect(view.queryByText("Row 23")).not.toBeNull();
  expect(view.queryByText("Row 22")).toBeNull();
  expect(view.queryByText("Row 27")).not.toBeNull();
});
