// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventTimer } from "../../types/api";
import { useAssignmentCountdown } from "../../hooks/utils/use-assignment-countdown";
import { HeroTimerCountdown } from "./hero-timer-countdown";

const translations = {
  "events.heroes.timerExpired": "Timer wygasł",
  "events.heroes.countdownUntilSpawnWindow": "Do początku okna respawnu",
  "events.heroes.countdownUntilSpawnWindowEnd": "Do końca okna respawnu",
  "events.respawn.maxSpawnTime": "Maksymalny czas spawnu",
  "events.respawn.minSpawnTime": "Minimalny czas spawnu",
};

await initializeTestTranslations(translations);

const timer: EventTimer = {
  npcId: 123,
  world: "tempest",
  minSpawnTime: "2026-07-30T12:00:00.000Z",
  maxSpawnTime: "2026-07-30T15:00:00.000Z",
  npc: {
    name: "Test Hero",
    icon: null,
  },
};

describe("HeroTimerCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows a countdown to the beginning of the spawn window", () => {
    vi.setSystemTime("2026-07-30T11:00:00.000Z");

    render(<HeroTimerCountdown timer={timer} />);

    const timerContainer = screen.getByText("01:00:00").parentElement;

    fireEvent.focus(timerContainer!);

    expect(screen.getByText("Do początku okna respawnu")).toBeTruthy();
    expect(screen.queryByText("Do końca okna respawnu")).toBeNull();
  });

  it("shows a countdown to the end of an open spawn window", () => {
    vi.setSystemTime("2026-07-30T13:00:00.000Z");

    render(<HeroTimerCountdown timer={timer} />);

    const timerContainer = screen.getByText("02:00:00").parentElement;

    fireEvent.focus(timerContainer!);

    expect(screen.getByText("Do końca okna respawnu")).toBeTruthy();
  });

  it("keeps other countdowns advancing after one timer expires and unmounts", () => {
    vi.setSystemTime("2026-07-30T14:59:59.000Z");

    const first = render(<HeroTimerCountdown timer={timer} />);
    render(
      <HeroTimerCountdown
        timer={{ ...timer, maxSpawnTime: "2026-07-30T15:00:03.000Z" }}
      />,
    );

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Timer wygasł")).toBeTruthy();
    expect(screen.getByText("00:00:03")).toBeTruthy();

    first.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("00:00:02")).toBeTruthy();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("Timer wygasł")).toBeTruthy();
  });

  it("unlocks assignments on the shared clock after the hero timer expires", () => {
    vi.setSystemTime("2026-07-30T14:59:59.000Z");
    render(<HeroTimerCountdown timer={timer} />);
    const enabledAt = Date.now() + 2000;

    const { result } = renderHook(() =>
      useAssignmentCountdown(true, enabledAt),
    );

    expect(result.current.isEnabled).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Timer wygasł")).toBeTruthy();
    expect(result.current.isEnabled).toBe(false);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toEqual({ isEnabled: true, formattedTime: null });
  });
});
