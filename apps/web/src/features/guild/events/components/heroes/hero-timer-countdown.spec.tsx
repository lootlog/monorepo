// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventTimer } from "../../types/api";
import { HeroTimerCountdown } from "./hero-timer-countdown";

const translations: Record<string, string> = {
  "events.heroes.countdownUntilSpawnWindow": "Do początku okna respawnu",
  "events.heroes.countdownUntilSpawnWindowEnd": "Do końca okna respawnu",
  "events.respawn.maxSpawnTime": "Maksymalny czas spawnu",
  "events.respawn.minSpawnTime": "Minimalny czas spawnu",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

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

  it("shows an amber countdown to the beginning of the spawn window", () => {
    vi.setSystemTime("2026-07-30T11:00:00.000Z");

    render(<HeroTimerCountdown timer={timer} />);

    const timerContainer = screen.getByText("01:00:00").parentElement;

    expect(timerContainer?.className).toContain("bg-amber-500/10");
    expect(timerContainer?.className).toContain("text-amber-500");

    fireEvent.focus(timerContainer!);

    expect(screen.getByText("Do początku okna respawnu")).toBeTruthy();
    expect(screen.queryByText("Do końca okna respawnu")).toBeNull();
  });

  it("shows a green countdown to the end of an open spawn window", () => {
    vi.setSystemTime("2026-07-30T13:00:00.000Z");

    render(<HeroTimerCountdown timer={timer} />);

    const timerContainer = screen.getByText("02:00:00").parentElement;

    expect(timerContainer?.className).toContain("bg-green-500/10");
    expect(timerContainer?.className).toContain("text-green-500");

    fireEvent.focus(timerContainer!);

    expect(screen.getByText("Do końca okna respawnu")).toBeTruthy();
  });
});
