import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

const singleTimerSpy = vi.fn();

let mockGuilds = [{ id: "guild-1", name: "Alpha" }];

vi.mock("@/lib/api/generated/main/users/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => ["guilds"],
  useUsersControllerGetCurrentUserAccessibleGuilds: () => ({
    data: mockGuilds,
  }),
}));

vi.mock("@/lib/api/generated-helpers", () => ({
  getGuildIds: (guilds: Array<{ id: string }>) =>
    guilds.map((guild) => guild.id),
  getGuildNamesById: (guilds: Array<{ id: string; name: string }>) =>
    Object.fromEntries(guilds.map((guild) => [guild.id, guild.name])),
}));

vi.mock("./single-timer", () => ({
  SingleTimer: (props: unknown) => {
    singleTimerSpy(props);
    return <div>SingleTimer</div>;
  },
}));

import { TimersGrid } from "./timers-grid";

const createTimer = (name: string): TimerWithTimeLeft =>
  ({
    id: `timer-${name}`,
    guildId: "guild-1",
    timerKey: `timer-${name}`,
    world: "pandora",
    npcId: 10,
    minSpawnTime: "2026-04-22T10:00:00.000Z",
    maxSpawnTime: "2026-04-22T10:05:00.000Z",
    updatedAt: "2026-04-22T09:59:00.000Z",
    wasReset: false,
    npc: {
      id: 10,
      name,
      lvl: 120,
      prof: "W",
      icon: "icon.gif",
      wt: 10,
      type: "hero",
      margonemType: 4,
      location: "Ruins",
    } as never,
    minTimeLeft: 1_000,
    maxTimeLeft: 2_000,
  }) as TimerWithTimeLeft;

describe("TimersGrid", () => {
  beforeEach(() => {
    singleTimerSpy.mockReset();
    mockGuilds = [{ id: "guild-1", name: "Alpha" }];
  });

  it("passes guild metadata and hidden-state flags to each timer tile", () => {
    render(
      <TimersGrid
        timers={[createTimer("Tanroth"), createTimer("Mushita")]}
        settingsKey="guild-1"
        hiddenTimers={["Mushita"]}
        minColumnWidth={120}
      />,
    );

    expect(screen.getAllByText("SingleTimer")).toHaveLength(2);
    expect(singleTimerSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        guildIds: ["guild-1"],
        guildNamesById: { "guild-1": "Alpha" },
        settingsKey: "guild-1",
        isHidden: false,
      }),
    );
    expect(singleTimerSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        isHidden: true,
      }),
    );
  });
});
