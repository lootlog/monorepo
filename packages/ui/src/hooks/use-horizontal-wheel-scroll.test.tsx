import { useRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useHorizontalWheelScroll } from "./use-horizontal-wheel-scroll";

function Scroller() {
  const ref = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(ref);
  return <div ref={ref} data-testid="scroller" />;
}

afterEach(cleanup);

it("moves vertical wheel input horizontally and releases page scrolling at either boundary", () => {
  const { getByTestId } = render(<Scroller />);
  const viewport = getByTestId("scroller");
  Object.defineProperties(viewport, {
    clientWidth: { value: 200 },
    scrollWidth: { value: 500 },
  });
  const wheel = (deltaY: number) => {
    const event = new WheelEvent("wheel", { deltaY, cancelable: true });
    viewport.dispatchEvent(event);
    return event.defaultPrevented;
  };
  expect(wheel(-40)).toBe(false);
  expect(wheel(120)).toBe(true);
  expect(viewport.scrollLeft).toBe(120);
  expect(wheel(400)).toBe(true);
  expect(viewport.scrollLeft).toBe(300);
  expect(wheel(40)).toBe(false);
});

it("preserves zoom and native horizontal gestures and normalizes line and page deltas", () => {
  const { getByTestId } = render(<Scroller />);
  const viewport = getByTestId("scroller");
  Object.defineProperties(viewport, {
    clientWidth: { value: 200 },
    scrollWidth: { value: 1000 },
  });
  for (const input of [
    { deltaY: 50, ctrlKey: true },
    { deltaX: 80, deltaY: 20 },
  ]) {
    const event = new WheelEvent("wheel", { ...input, cancelable: true });
    // Happy DOM WheelEvent omits MouseEvent modifiers.
    Object.defineProperty(event, "ctrlKey", {
      value: "ctrlKey" in input && input.ctrlKey,
    });
    viewport.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(viewport.scrollLeft).toBe(0);
  }
  viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: 2, deltaMode: 1 }));
  expect(viewport.scrollLeft).toBe(32);
  viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, deltaMode: 2 }));
  expect(viewport.scrollLeft).toBe(232);
});
