import { beforeEach, expect, it, onTestFinished } from "vitest";
import { waitFor } from "@testing-library/react";
import { configureApiClients } from "@lootlog/client/transport";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@lootlog/client/main";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { RuntimeIngressSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { queryClient } from "@/lib/query-client";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { HeroTrackerTimerProcessor } from "./hero-tracker-timer-processor";

const configKey =
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
    accountId: "202",
  });

// The template as Margonem sent it on 2026-09-12: no weight, profession or type.
const trackerTemplate = {
  id: 190436,
  level: 282,
  nick: "Doświadczony Tropiciel Herosów",
  resp_rand: 50,
};

const claimedTracker = (killSeconds: number) =>
  ({
    npc_tpls: [trackerTemplate],
    npcs: [
      {
        icon: { id: 9791 },
        id: 190436,
        tpl: 190436,
        x: 17,
        y: 22,
        killSeconds,
      },
    ],
  }) satisfies GameEvent;

const createFixture = () => {
  setTestRuntimeGame({
    world: "luvia",
    hero: { accountId: "202", characterId: "101" },
    map: { id: 3331, name: "Jaskinia Piaskowej Burzy s.1", visibility: 30 },
  });

  // Margonem's NPC updates carry no pre-event game state in ingress.
  const ingress = {
    game: null,
    intent: null,
    npcsById: {},
    othersById: {},
  } satisfies RuntimeIngressSnapshot;

  const requests: Request[] = [];

  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: (input, init) => {
          requests.push(new Request(input, init));

          return Promise.resolve(
            Response.json({ submittedGuilds: [], rejectedGuilds: [] }),
          );
        },
      },
    }),
  );
  queryClient.setQueryData(configKey, {
    "101": { catchingGuildIds: ["guild-1"] },
  });
  const processor = new HeroTrackerTimerProcessor();

  return {
    requests,
    handle: (event: GameEvent) => processor.handle(event, ingress),
  };
};

beforeEach(() => {
  queryClient.clear();
});

it("reports a claimed Hero Tracker's entrance once, measuring its respawn from the close", async () => {
  const fixture = createFixture();

  fixture.handle(claimedTracker(1200));
  // Other players' packets repeat the same countdown a few seconds later.
  fixture.handle(claimedTracker(1195));

  await waitFor(() => expect(fixture.requests).toHaveLength(1));
  const body = await fixture.requests[0]?.json();

  expect(new URL(fixture.requests[0]?.url ?? "").pathname).toBe("/timers/auto");
  expect(body).toMatchObject({
    respBaseSeconds: 5400,
    respawnRandomness: 50,
    world: "luvia",
    npc: {
      id: 190436,
      name: "Doświadczony Tropiciel Herosów",
      lvl: 282,
      wt: 0,
      location: "Jaskinia Piaskowej Burzy s.1",
    },
  });
  expect(body.entranceSecondsLeft).toBe(1200);
  expect(body).not.toHaveProperty("entranceClosesAt");
});

it("does not start a timer for a tracker nobody has claimed", async () => {
  const fixture = createFixture();

  fixture.handle(claimedTracker(0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(fixture.requests).toHaveLength(0);
});
