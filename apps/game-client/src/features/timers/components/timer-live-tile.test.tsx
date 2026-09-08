import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTimerFixture } from "../timer-fixtures";
import { TimerClockProvider } from "./timer-clock-provider";

import { TimerLiveTile } from "./timer-live-tile";

const NOW = new Date("2026-07-20T10:00:00.000Z");

const createTimer = () =>
  createTimerFixture({
    minSpawnTime: new Date(NOW.getTime() + 4_000).toISOString(),
    maxSpawnTime: new Date(NOW.getTime() + 5_000).toISOString(),
    updatedAt: NOW.toISOString(),
  });

describe("TimerLiveTile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates countdown and min/max phases on the shared clock", () => {
    render(
      <TimerClockProvider>
        <TimerLiveTile
          countdownMode="min"
          displayMode="row"
          fontSize={11}
          label="Tanroth"
          timer={createTimer()}
        />
      </TimerClockProvider>,
    );

    expect(screen.getByText("00:00:04")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("00:00:03")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByText("00:00:00").parentElement).toHaveClass(
      "ll:text-orange-400",
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("-00:00:01").parentElement).toHaveClass(
      "ll:text-red-500",
    );
  });
});
