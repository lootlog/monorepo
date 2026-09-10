// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LevelRangeFilter } from "./level-range-filter";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("commits only the last valid draft and cancels a pending edit on unmount", () => {
  vi.useFakeTimers();
  const onMinLevelChange = vi.fn();
  const onMaxLevelChange = vi.fn();
  const { unmount } = render(
    <LevelRangeFilter
      onMinLevelChange={onMinLevelChange}
      onMaxLevelChange={onMaxLevelChange}
    />,
  );
  const input = screen.getAllByRole("spinbutton")[0];
  if (!input) throw new Error("Missing minimum level input");
  fireEvent.change(input, { target: { value: "10" } });
  fireEvent.change(input, { target: { value: "20" } });
  fireEvent.change(input, { target: { value: "501" } });
  expect(onMinLevelChange).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(500));
  expect(onMinLevelChange).toHaveBeenCalledExactlyOnceWith(20);
  fireEvent.change(input, { target: { value: "30" } });
  unmount();
  act(() => vi.advanceTimersByTime(500));
  expect(onMinLevelChange).toHaveBeenCalledTimes(1);
  expect(onMaxLevelChange).not.toHaveBeenCalled();
});
