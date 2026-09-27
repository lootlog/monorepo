import { Profiler } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import i18n from "i18next";
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
import {
  TimerMapPresenceProvider,
  useTimerMapPresence,
  useTimerMapThreat,
} from "./timer-map-presence-provider";
import { TimerMapPresenceIndicator } from "./timer-map-presence-indicator";
import { TimerMapThreatIndicator } from "./timer-map-threat-indicator";

const occupiedLabel = (count = 1) =>
  i18n.t("timers:tooltip.mapOccupied", { count });

const afkLabel = (count = 1) => i18n.t("timers:tooltip.mapAfk", { count });

function Presence({ timer }: { timer: TimerWithTimeLeft }) {
  const occupancy = useTimerMapPresence(timer);

  return occupancy ? <TimerMapPresenceIndicator occupancy={occupancy} /> : null;
}

function Threat({ timer }: { timer: TimerWithTimeLeft }) {
  const threat = useTimerMapThreat(timer);

  return threat ? <TimerMapThreatIndicator threat={threat} /> : null;
}

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

it("shares presence with online rows without committing the timer subtree for same-map position bursts, and shows when everyone there goes AFK", async () => {
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
              <Presence key={index} timer={entry} />
            ))}
          </div>
        </Profiler>
      </TimerMapPresenceProvider>
    </harness.wrapper>,
  );

  harness.open();
  await harness.join(["guild-1"], policy(["guild-1"]));
  await waitFor(() =>
    expect(screen.getAllByRole("img", { name: occupiedLabel() })).toHaveLength(
      100,
    ),
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
          lastSeen: index,
          location: { map: "Karka-han", x: index % 32, y: index % 24 },
        }),
      })),
    },
  });
  await waitFor(() => expect(harness.fetchPresence).toHaveBeenCalledTimes(1));
  expect(commits).not.toHaveBeenCalled();
  await harness.receive({
    v: 1,
    type: "presence.delta",
    data: {
      organizationId: "guild-1",
      revision: 3,
      changes: [
        {
          action: "upsert",
          presence: createOnlinePresence({
            isAfk: true,
            location: { map: "Karka-han" },
          }),
        },
      ],
    },
  });
  await waitFor(() =>
    expect(screen.getAllByRole("img", { name: afkLabel() })).toHaveLength(100),
  );
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
          <section key={index} aria-label={`Timer ${index}`}>
            <Presence timer={entry} />
          </section>
        ))}
      </TimerMapPresenceProvider>
    </harness.wrapper>,
  );

  harness.open();
  await harness.join(["guild-1", "guild-2"], policy(["guild-1", "guild-2"]));
  const occupied = within(screen.getByRole("region", { name: "Timer 0" }));
  expect(await occupied.findByRole("img", { name: afkLabel() })).toBeVisible();
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(harness.fetchPresence).toHaveBeenCalledTimes(3);
  view.unmount();
});

it("counts an enemy seen through both organizations of a grouped timer once and ignores other worlds", async () => {
  const harness = createOnlinePlayersTest();

  const grouped = {
    ...timer(),
    mergedGuildIds: [
      { guildId: "guild-1", npcId: 10 },
      { guildId: "guild-2", npcId: 10 },
    ],
  };

  const threat = (guildId: string, world: string, targetIds: string[]) =>
    harness.receive({
      v: 1,
      type: "air-tag.map-threat-updated",
      data: {
        guildId,
        world,
        mapId: 7,
        mapName: "Karka-han",
        revision: 1,
        enemies: targetIds.map((targetId) => ({
          targetId,
          nickname: `Enemy ${targetId}`,
          ageMs: 0,
        })),
      },
    });

  const view = render(
    <harness.wrapper>
      <TimerMapPresenceProvider timers={[grouped]}>
        <Threat timer={grouped} />
      </TimerMapPresenceProvider>
    </harness.wrapper>,
  );

  harness.open();
  await harness.join(["guild-1", "guild-2"], policy(["guild-1", "guild-2"]));
  await threat("guild-1", "alpha", ["7"]);
  await threat("guild-2", "alpha", ["7", "8"]);
  await threat("guild-2", "beta", ["9"]);
  expect(
    await screen.findByRole("img", {
      name: i18n.t("timers:tooltip.mapThreat", { count: 2 }),
    }),
  ).toBeVisible();
  view.unmount();
});
