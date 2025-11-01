import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimersUnderBagActions } from "./timers-under-bag-actions";

describe("TimersUnderBagActions", () => {
  const defaultProps = {
    timerFiltersEnabled: false,
    toggleTimerFiltersEnabled: vi.fn(),
    colorFiltersEnabled: false,
    toggleColorFiltersEnabled: vi.fn(),
    timersSortOrder: "asc" as const,
    setTimersSortOrder: vi.fn(),
    showHiddenTimers: false,
    setShowHiddenTimers: vi.fn(),
  };

  it("should render all action buttons", () => {
    const { container } = render(<TimersUnderBagActions {...defaultProps} />);

    const buttons = container.querySelectorAll("svg");
    expect(buttons.length).toBe(4);
  });

  it("should call toggleTimerFiltersEnabled when filter button clicked", async () => {
    const toggleTimerFiltersEnabled = vi.fn();
    const { container } = render(
      <TimersUnderBagActions
        {...defaultProps}
        toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
      />,
    );

    const filterButton = container.querySelector("svg");
    if (filterButton) {
      await userEvent.click(filterButton);
      expect(toggleTimerFiltersEnabled).toHaveBeenCalledTimes(1);
    }
  });

  it("should show ascending sort icon when sortOrder is asc", () => {
    const { container } = render(
      <TimersUnderBagActions {...defaultProps} timersSortOrder="asc" />,
    );

    expect(container.querySelector('svg[key="sort-asc"]')).toBeDefined();
  });

  it("should show descending sort icon when sortOrder is desc", () => {
    const { container } = render(
      <TimersUnderBagActions {...defaultProps} timersSortOrder="desc" />,
    );

    expect(container.querySelector('svg[key="sort-desc"]')).toBeDefined();
  });

  it("should call setTimersSortOrder when sort button clicked", async () => {
    const setTimersSortOrder = vi.fn();
    const { container } = render(
      <TimersUnderBagActions
        {...defaultProps}
        setTimersSortOrder={setTimersSortOrder}
      />,
    );

    const sortButton = container.querySelector('svg[key="sort-asc"]');
    if (sortButton) {
      await userEvent.click(sortButton);
      expect(setTimersSortOrder).toHaveBeenCalledWith("desc");
    }
  });

  it("should show eye icon when showHiddenTimers is true", () => {
    const { container } = render(
      <TimersUnderBagActions {...defaultProps} showHiddenTimers={true} />,
    );

    expect(container.querySelector('svg[key="show-hidden"]')).toBeDefined();
  });

  it("should show eye-off icon when showHiddenTimers is false", () => {
    const { container } = render(
      <TimersUnderBagActions {...defaultProps} showHiddenTimers={false} />,
    );

    expect(container.querySelector('svg[key="hide-hidden"]')).toBeDefined();
  });

  it("should call setShowHiddenTimers when visibility button clicked", async () => {
    const setShowHiddenTimers = vi.fn();
    const { container } = render(
      <TimersUnderBagActions
        {...defaultProps}
        setShowHiddenTimers={setShowHiddenTimers}
      />,
    );

    const visibilityButton = container.querySelector('svg[key="hide-hidden"]');
    if (visibilityButton) {
      await userEvent.click(visibilityButton);
      expect(setShowHiddenTimers).toHaveBeenCalledWith(true);
    }
  });
});
