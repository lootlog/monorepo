// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollArea } from "./scroll-area";

vi.mock("@base-ui/react/scroll-area", async () => {
  const React = await import("react");
  type PrimitiveProps = React.PropsWithChildren<
    React.HTMLAttributes<HTMLDivElement>
  >;
  type ScrollbarProps = PrimitiveProps & {
    orientation?: "vertical" | "horizontal";
  };

  return {
    ScrollArea: {
      Corner: (props: React.HTMLAttributes<HTMLDivElement>) =>
        React.createElement("div", props),
      Root: ({ children, ...props }: PrimitiveProps) =>
        React.createElement("div", props, children),
      Scrollbar: ({
        children,
        orientation = "vertical",
        ...props
      }: ScrollbarProps) =>
        React.createElement(
          "div",
          { ...props, "data-orientation": orientation },
          children,
        ),
      Thumb: (props: React.HTMLAttributes<HTMLDivElement>) =>
        React.createElement("div", props),
      Viewport: React.forwardRef<HTMLDivElement, PrimitiveProps>(
        ({ children, ...props }, ref) =>
          React.createElement("div", { ...props, ref }, children),
      ),
    },
  };
});

afterEach(cleanup);

describe("ScrollArea", () => {
  it("renders both scrollbars by default", () => {
    const { container } = render(<ScrollArea>Content</ScrollArea>);

    expect(
      container.querySelector(
        '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
      ),
    ).not.toBeNull();
  });

  it("omits the horizontal scrollbar in vertical mode", () => {
    const { container } = render(
      <ScrollArea orientation="vertical">Content</ScrollArea>,
    );

    expect(
      container.querySelector(
        '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
      ),
    ).toBeNull();
  });
});
