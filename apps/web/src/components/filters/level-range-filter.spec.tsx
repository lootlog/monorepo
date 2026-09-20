// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { LevelRangeFilter } from "./level-range-filter";

// A URL-backed caller: each committed bound comes back as a prop.
function CommittedRange({ onChange }: { onChange: (range: string) => void }) {
  const [range, setRange] = useState<{ min?: number; max?: number }>({});

  const update = (next: { min?: number; max?: number }) => {
    setRange((current) => {
      const merged = { ...current, ...next };
      onChange(`${merged.min ?? ""}-${merged.max ?? ""}`);

      return merged;
    });
  };

  return (
    <>
      <LevelRangeFilter
        minLevel={range.min}
        maxLevel={range.max}
        onMinLevelChange={(min) => update({ min })}
        onMaxLevelChange={(max) => update({ max })}
      />
      <button type="button" onClick={() => setRange({})}>
        reset
      </button>
    </>
  );
}

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

it("commits both bounds typed within one debounce window and follows an outside reset", () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  render(<CommittedRange onChange={onChange} />);
  const [minInput, maxInput] = screen.getAllByRole("spinbutton");

  if (!minInput || !maxInput) throw new Error("Missing level inputs");
  fireEvent.change(minInput, { target: { value: "100" } });
  act(() => vi.advanceTimersByTime(300));
  fireEvent.change(maxInput, { target: { value: "200" } });
  act(() => vi.advanceTimersByTime(500));
  expect(onChange).toHaveBeenLastCalledWith("100-200");
  expect(minInput).toHaveProperty("value", "100");
  expect(maxInput).toHaveProperty("value", "200");

  fireEvent.click(screen.getByRole("button", { name: "reset" }));
  expect(minInput).toHaveProperty("value", "");
  expect(maxInput).toHaveProperty("value", "");
});
