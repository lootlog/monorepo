import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Timer } from "@/api/timers.api";
import { TimerTooltip } from "./timer-tooltip";

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: "guild-1",
  timerKey: "timer-1",
  world: "pandora",
  npcId: 10,
  minSpawnTime: new Date(2026, 3, 22, 12).toISOString(),
  maxSpawnTime: new Date(2026, 3, 22, 12, 5).toISOString(),
  updatedAt: new Date(2026, 3, 22, 11, 59).toISOString(),
  wasReset: overrides?.wasReset ?? true,
  npc: {
    id: 10,
    name: "Tanroth",
    lvl: 120,
    prof: "W",
    icon: "icon.gif",
    wt: 10,
    type: "hero",
    margonemType: 4,
    location: "Ruins",
  } as never,
  members: [
    {
      id: "member-1",
      name: "Tester",
      guildId: "guild-1",
    } as never,
    {
      id: "member-2",
      name: "Scout",
      guildId: "guild-2",
    } as never,
  ],
  actorCharactersByMemberId: {
    "member-1": {
      name: "Hero One",
      lvl: 300,
      prof: "BLADE_DANCER",
      icon: "hero.gif",
      characterId: 1,
      accountId: 2,
    },
  },
  ...overrides,
});

describe("TimerTooltip", () => {
  it("renders timer metadata, members with guild names, and spawn windows", () => {
    render(
      <TimerTooltip
        timer={createTimer()}
        guildNamesById={{
          "guild-1": "Alpha",
          "guild-2": "Beta",
        }}
      />,
    );

    expect(screen.getByText("Tanroth")).toBeVisible();
    expect(screen.getByText("(120w)")).toBeVisible();
    expect(screen.getByText("Dodane przez:")).toBeVisible();
    expect(screen.getByText("Tester (Alpha)")).toBeVisible();
    expect(screen.getByText("Hero One (300b)")).toBeVisible();
    expect(screen.getByText("+1")).toBeVisible();
    expect(screen.queryByText("Scout (Beta)")).not.toBeInTheDocument();
    expect(screen.getByText("⟳ Timer został zresetowany")).toBeVisible();
    expect(screen.getByText("Dodano:")).toBeVisible();
    expect(screen.getByText("22.04.2026 - 11:59:00")).toBeVisible();
    expect(screen.getByText("Min:")).toBeVisible();
    expect(screen.getByText("22.04.2026 - 12:00:00")).toBeVisible();
    expect(screen.getByText("Max:")).toBeVisible();
    expect(screen.getByText("22.04.2026 - 12:05:00")).toBeVisible();
  });

  it("omits member and reset sections when the timer has no such metadata", () => {
    render(
      <TimerTooltip
        timer={createTimer({
          members: [],
          updatedAt: undefined,
          wasReset: false,
        })}
        guildNamesById={{}}
      />,
    );

    expect(screen.queryByText("Dodane przez:")).not.toBeInTheDocument();
    expect(
      screen.queryByText("⟳ Timer został zresetowany"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Dodano:")).not.toBeInTheDocument();
  });
});
