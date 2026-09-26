import { Profiler } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { NpcType } from "@/api/npcs.api";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
} from "@/features/online-players/online-players-test-fixtures";
import { usePlayersPresence } from "@/features/online-players/hooks/use-players-presence";
import { createTimerFixture } from "../timer-fixtures";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { TimerMapPresenceProvider } from "./timer-map-presence-provider";
import { TimerMapPresenceIndicator } from "./timer-map-presence-indicator";

const policy = (organizations: string[]) =>
  createAccessPolicySnapshot(
    organizations.map((id) => ({
      guild: { id, ownerId: "owner" },
      roles: [
        {
          permissions: [
            Permission.LOOTLOG_ONLINE_PLAYERS_READ,
            Permission.LOOTLOG_PRESENCE_LOCATION_READ,
          ],
          lvlRangeFrom: 1,
          lvlRangeTo: 300,
        },
      ],
    })),
    "user",
  );

function timer(guildId = "guild-1", world = "alpha"): TimerWithTimeLeft {
  const base = createTimerFixture({ guildId, world });

  return {
    ...base,
    minTimeLeft: 0,
    maxTimeLeft: 0,
    npc: { ...base.npc, type: NpcType.ELITE2, location: "Karka-han" },
  };
}

function OnlineRows() {
  usePlayersPresence("guild-1", "alpha");

  return null;
}

it("shares presence with online rows without committing the timer subtree for same-map bursts", async () => {
  const harness = createOnlinePlayersTest();
  const timers = Array.from({ length: 100 }, () => timer());
  const commits = vi.fn();

  const view = render(
    <harness.wrapper>
      <OnlineRows />
      <TimerMapPresenceProvider timers={timers}>
        <Profiler id="timers" onRender={commits}>
          <div>
            {timers.map((entry, index) => (
              <TimerMapPresenceIndicator
                key={index}
                timer={entry}
                label="Occupied"
              />
            ))}
          </div>
        </Profiler>
      </TimerMapPresenceProvider>
    </harness.wrapper>,
  );

  harness.open();
  await harness.join(["guild-1"], policy(["guild-1"]));
  await waitFor(() =>
    expect(screen.getAllByRole("img", { name: "Occupied" })).toHaveLength(100),
  );
  expect(harness.fetchPresence).toHaveBeenCalledTimes(1);
  commits.mockClear();
  await harness.receive({
    v: 1,
    type: "presence.delta",
    data: {
      organizationId: "guild-1",
      revision: 2,
      changes: Array.from({ length: 1000 }, (_, index) => ({
        action: "upsert",
        presence: createOnlinePresence({
          isAfk: index % 2 === 0,
          lastSeen: index,
          location: { map: "Karka-han", x: index % 32, y: index % 24 },
        }),
      })),
    },
  });
  await waitFor(() => expect(harness.fetchPresence).toHaveBeenCalledTimes(1));
  expect(commits).not.toHaveBeenCalled();
  view.unmount();
});

it("includes own AFK presence, excludes heroes, and restricts grouped occupancy to represented organizations and world", async () => {
  const harness = createOnlinePlayersTest();

  const own = createOnlinePresence({
    isAfk: true,
    character: {
      world: "alpha",
      name: "Current Hero",
      lvl: 300,
      icon: "hero.gif",
      characterId: "1",
      accountId: "1",
      prof: "w",
    },
  });

  harness.fetchPresence.mockImplementation(async (guildId, world) =>
    createPresenceSnapshot(
      guildId === "guild-2" && world === "alpha" ? [own] : [],
    ),
  );

  const grouped = {
    ...timer(),
    mergedGuildIds: [
      { guildId: "guild-1", npcId: 10 },
      { guildId: "guild-2", npcId: 10 },
    ],
  };

  const hero = { ...grouped, npc: { ...grouped.npc, type: NpcType.HERO } };

  const unknownMap = {
    ...grouped,
    npc: { ...grouped.npc, location: undefined },
  };

  const eventHero = { ...hero, npc: { ...hero.npc, type: NpcType.EVENT_HERO } };

  const entries = [
    grouped,
    timer(),
    timer("guild-2", "beta"),
    hero,
    unknownMap,
    eventHero,
  ];

  const view = render(
    <harness.wrapper>
      <TimerMapPresenceProvider timers={entries}>
        {entries.map((entry, index) => (
          <TimerMapPresenceIndicator
            key={index}
            timer={entry}
            label={`Timer ${index}`}
          />
        ))}
      </TimerMapPresenceProvider>
    </harness.wrapper>,
  );

  harness.open();
  await harness.join(["guild-1", "guild-2"], policy(["guild-1", "guild-2"]));
  expect(await screen.findByRole("img", { name: "Timer 0" })).toBeVisible();
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(harness.fetchPresence).toHaveBeenCalledTimes(3);
  view.unmount();
});
