import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "@/api/timers.api";
import { TimerClockProvider } from "./timer-clock-provider";

vi.mock("./timer-tile-view", () => ({
  TimerTileView: ({
    hasPassedRedThreshold,
    isMinSpawnTime,
    timeLabel,
  }: {
    hasPassedRedThreshold: boolean;
    isMinSpawnTime: boolean;
    timeLabel: string;
  }) => (
    <output data-testid="live-timer">
      {`${timeLabel}:${String(isMinSpawnTime)}:${String(hasPassedRedThreshold)}`}
    </output>
  ),
}));

import { TimerLiveTile } from "./timer-live-tile";

const NOW = new Date("2026-07-20T10:00:00.000Z");

const createTimer = (): Timer =>
  ({
    guildId: "guild-1",
    timerKey: "timer-1",
    world: "gefion",
    npcId: 10,
    minSpawnTime: new Date(NOW.getTime() + 4_000).toISOString(),
    maxSpawnTime: new Date(NOW.getTime() + 5_000).toISOString(),
    updatedAt: NOW.toISOString(),
    wasReset: false,
    npc: { id: 10, name: "Tanroth" },
  }) as Timer;

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

    expect(screen.getByTestId("live-timer")).toHaveTextContent(
      "00:00:04:false:false",
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("live-timer")).toHaveTextContent(
      "00:00:03:false:false",
    );

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByTestId("live-timer")).toHaveTextContent(
      "00:00:00:true:false",
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("live-timer")).toHaveTextContent(
      "-00:00:01:true:true",
    );
  });
});
