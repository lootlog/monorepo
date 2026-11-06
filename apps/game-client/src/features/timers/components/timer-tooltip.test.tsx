import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createTimerFixture,
  createTimerMemberFixture,
} from "../timer-fixtures";
import type { Timer } from "@/api/timers.api";
import { TimerTooltip } from "./timer-tooltip";

const createTimer = (overrides: Partial<Timer> = {}) =>
  createTimerFixture({
    minSpawnTime: new Date(2026, 3, 22, 12).toISOString(),
    maxSpawnTime: new Date(2026, 3, 22, 12, 5).toISOString(),
    updatedAt: new Date(2026, 3, 22, 11, 59).toISOString(),
    wasReset: true,
    members: [
      createTimerMemberFixture(),
      createTimerMemberFixture({
        id: 2,
        userId: "user-2",
        name: "Scout",
        guildId: "guild-2",
      }),
    ],
    actorCharactersByMemberId: {
      "1": {
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
    expect(screen.getByText("Dodany przez:")).toBeVisible();
    expect(screen.getByText("Tester (Alpha)")).toBeVisible();
    expect(screen.getByText("Hero One (300b)")).toBeVisible();
    expect(screen.getByText("+1")).toBeVisible();
    expect(screen.queryByText("Scout (Beta)")).not.toBeInTheDocument();
    expect(screen.getByText("Timer został zresetowany")).toBeVisible();
    expect(screen.getByText("Dodano:")).toBeVisible();
    expect(screen.getByText("22.04 11:59:00")).toBeVisible();
    expect(screen.getByText("Min:")).toBeVisible();
    expect(screen.getByText("22.04 12:00:00")).toBeVisible();
    expect(screen.getByText("Max:")).toBeVisible();
    expect(screen.getByText("22.04 12:05:00")).toBeVisible();
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

    expect(screen.queryByText("Dodany przez:")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Timer został zresetowany"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Dodano:")).not.toBeInTheDocument();
  });

  it("summarises players past the first rows until the tooltip expands", () => {
    const occupancy = {
      allAfk: false,
      players: Array.from({ length: 10 }, (_, index) => ({
        key: `player-${index}`,
        name: `Player ${index}`,
        isAfk: false,
      })),
    };

    const view = render(
      <TimerTooltip
        timer={createTimer()}
        guildNamesById={{}}
        occupancy={occupancy}
      />,
    );

    expect(screen.getByText("Player 7")).toBeVisible();
    expect(screen.queryByText("Player 8")).not.toBeInTheDocument();
    expect(screen.getByText("i jeszcze 2")).toBeVisible();

    view.rerender(
      <TimerTooltip
        timer={createTimer()}
        guildNamesById={{}}
        occupancy={occupancy}
        expanded
      />,
    );

    expect(screen.getByText("Player 9")).toBeVisible();
    expect(screen.queryByText("i jeszcze 2")).not.toBeInTheDocument();
  });
});
