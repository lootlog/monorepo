import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimerClockProvider, useTimerClockEpoch } from "./timer-clock-provider";

const NOW = new Date("2026-07-20T10:00:00.000Z").getTime();

const TimerClockLabel = ({ index }: { index: number }) => {
  const epoch = useTimerClockEpoch();

  return <output data-testid={`timer-clock-${index}`}>{epoch}</output>;
};

describe("TimerClockProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([1, 20, 100])(
    "updates %i timer labels without rerendering the static parent",
    (timerCount) => {
      const parentRenderSpy = vi.fn();
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

      const StaticTimerGrid = () => {
        parentRenderSpy();

        return (
          <TimerClockProvider>
            {Array.from({ length: timerCount }, (_, index) => (
              <TimerClockLabel key={index} index={index} />
            ))}
          </TimerClockProvider>
        );
      };

      render(<StaticTimerGrid />);

      expect(parentRenderSpy).toHaveBeenCalledOnce();
      expect(setIntervalSpy).toHaveBeenCalledOnce();

      act(() => {
        vi.advanceTimersByTime(1_000);
      });

      expect(parentRenderSpy).toHaveBeenCalledOnce();
      expect(screen.getByTestId("timer-clock-0")).toHaveTextContent(
        String(NOW + 1_000),
      );
      expect(
        screen.getByTestId(`timer-clock-${timerCount - 1}`),
      ).toHaveTextContent(String(NOW + 1_000));
    },
  );

  it("does not start the clock when the visible grid is empty", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    render(<div data-testid="empty-grid" />);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
