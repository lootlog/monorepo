import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

const singleTimerSpy = vi.fn();
const permissionQueryOptionsSpy = vi.fn(
  ({ guildId }: { guildId: string }, _options?: unknown) => ({
    queryKey: ["permissions", guildId],
  }),
);
const useQueriesSpy = vi.fn(
  ({ queries }: { queries: Array<{ queryKey: string[] }> }) =>
    queries.map(({ queryKey }) => ({
      data:
        queryKey[1] === "guild-1"
          ? ["LOOTLOG_TIMERS_DELETE"]
          : ["LOOTLOG_TIMERS_RESET"],
    })),
);

let mockGuilds = [{ id: "guild-1", name: "Alpha" }];

vi.mock("@lootlog/api-client/react-query/main/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => ["guilds"],
  useUsersControllerGetCurrentUserAccessibleGuilds: () => ({
    data: mockGuilds,
  }),
}));

vi.mock("@lootlog/api-client/react-query/main/guilds", () => ({
  getGuildsControllerGetGuildPermissionsQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => ["permissions", guildId],
  getGuildsControllerGetGuildPermissionsQueryOptions: (
    parameters: { guildId: string },
    options?: unknown,
  ) => permissionQueryOptionsSpy(parameters, options),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueries: (options: { queries: Array<{ queryKey: string[] }> }) =>
    useQueriesSpy(options),
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

const createTimer = (name: string, guildId = "guild-1"): TimerWithTimeLeft =>
  ({
    id: `timer-${name}`,
    guildId,
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
    vi.useFakeTimers();
    singleTimerSpy.mockReset();
    permissionQueryOptionsSpy.mockClear();
    useQueriesSpy.mockClear();
    mockGuilds = [{ id: "guild-1", name: "Alpha" }];
  });

  afterEach(() => {
    vi.useRealTimers();
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
        accessPolicy: expect.anything(),
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

  it("creates one permissions observer per unique guild instead of per timer", () => {
    render(
      <TimersGrid
        timers={[
          createTimer("Tanroth", "guild-1"),
          createTimer("Mushita", "guild-1"),
          createTimer("Furruk", "guild-2"),
        ]}
        settingsKey="guild-1"
        hiddenTimers={[]}
        minColumnWidth={120}
      />,
    );

    expect(permissionQueryOptionsSpy).toHaveBeenCalledTimes(2);
    expect(permissionQueryOptionsSpy).toHaveBeenNthCalledWith(
      1,
      { guildId: "guild-1" },
      expect.objectContaining({
        query: expect.objectContaining({ staleTime: 5 * 60 * 1000 }),
      }),
    );
    expect(permissionQueryOptionsSpy).toHaveBeenNthCalledWith(
      2,
      { guildId: "guild-2" },
      expect.anything(),
    );
    expect(singleTimerSpy).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        accessPolicy: expect.anything(),
      }),
    );
  });

  it("does not repeat permission queries or static tile work on clock ticks", () => {
    render(
      <TimersGrid
        timers={Array.from({ length: 20 }, (_, index) =>
          createTimer(`Timer ${index}`),
        )}
        settingsKey="guild-1"
        hiddenTimers={[]}
        minColumnWidth={120}
      />,
    );

    expect(permissionQueryOptionsSpy).toHaveBeenCalledOnce();
    expect(useQueriesSpy).toHaveBeenCalledOnce();
    expect(singleTimerSpy).toHaveBeenCalledTimes(20);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(permissionQueryOptionsSpy).toHaveBeenCalledOnce();
    expect(useQueriesSpy).toHaveBeenCalledOnce();
    expect(singleTimerSpy).toHaveBeenCalledTimes(20);
  });
});
