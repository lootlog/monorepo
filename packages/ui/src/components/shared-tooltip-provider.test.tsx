import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SharedTooltipProvider,
  useSharedTooltip,
} from "./shared-tooltip-provider";

function Trigger() {
  const tooltip = useSharedTooltip();

  const show = (element: HTMLElement) =>
    tooltip?.showTooltip("Item details", element.getBoundingClientRect(), {
      triggerElement: element,
    });

  return (
    <a
      href="#item"
      onFocus={({ currentTarget }) => show(currentTarget)}
      onMouseEnter={({ currentTarget }) => show(currentTarget)}
      onClick={(event) => event.preventDefault()}
    >
      Item
    </a>
  );
}

const renderTrigger = () =>
  render(
    <SharedTooltipProvider>
      <Trigger />
    </SharedTooltipProvider>,
  );

describe("shared tooltip", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("closes when its trigger is pressed, so it does not stay over the page the trigger opens", () => {
    renderTrigger();

    fireEvent.mouseEnter(screen.getByRole("link", { name: "Item" }));
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Item details");

    fireEvent.click(screen.getByRole("link", { name: "Item" }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("tooltip")).not.toHaveAttribute("data-open");
  });

  it("does not open after a press whose focus scheduled it", () => {
    renderTrigger();

    const link = screen.getByRole("link", { name: "Item" });
    fireEvent.focus(link);
    fireEvent.click(link);
    act(() => vi.advanceTimersByTime(1000));

    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
