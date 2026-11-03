import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { configureApiClients } from "@lootlog/client/transport";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@lootlog/client/main";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { queryClient } from "@/lib/query-client";
import { createHeroSighting } from "@/features/hero-sightings/hero-sighting-fixtures";
import { useHeroSightingsStore } from "@/store/hero-sightings.store";
import { useWindowsStore } from "@/store/windows.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { HeroDetectorProcessor } from "./hero-detector-processor";

const configKey =
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
    accountId: "202",
  });

const NOW = Date.parse("2026-11-03T12:00:00Z");

// A detector answer as Margonem puts it in the system chat.
const DETECTOR_ANSWER =
  "[b]Tepeyollotl (258b)[/b] grasuje w: Oztotl Tzacua p.2 - sala 2";

const systemChat = (
  ...msg: { id: number; msg: string; style?: number; ts: number }[]
): GameEvent => ({
  chat: { channels: { system: { archivedIds: [], msg } } },
});

const answer = (id: number, ageSeconds = 1) => ({
  id,
  msg: DETECTOR_ANSWER,
  style: 4,
  ts: NOW / 1000 - ageSeconds,
});

const sighting = createHeroSighting({
  firstSeenAt: "2026-11-03T11:59:59.000Z",
  lastSeenAt: "2026-11-03T11:59:59.000Z",
});

const createFixture = (catchingGuildIds = ["guild-1"]) => {
  setTestRuntimeGame({
    world: "luvia",
    hero: { accountId: "202", characterId: "101" },
  });

  const requests: Request[] = [];

  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: (input, init) => {
          requests.push(new Request(input, init));

          return Promise.resolve(
            Response.json({
              submittedGuilds: [
                { guildId: "guild-1", guildName: "Guild", sighting },
              ],
              rejectedGuilds: [],
            }),
          );
        },
      },
    }),
  );
  queryClient.setQueryData(configKey, { "101": { catchingGuildIds } });
  const processor = new HeroDetectorProcessor();

  return {
    requests,
    handle: (event: GameEvent) => processor.handle(event),
  };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  queryClient.clear();
  useHeroSightingsStore.getState().dismissOwnDetection();
  useWindowsStore.getState().setOpen("hero-sightings", false);
});

afterEach(() => {
  vi.useRealTimers();
});

it("reports a fresh detector answer once with Margonem's answer time, then offers the claim", async () => {
  const fixture = createFixture();

  fixture.handle(systemChat(answer(501)));
  // The same answer arrives again with the next chat packet.
  fixture.handle(systemChat(answer(501)));

  await waitFor(() => expect(fixture.requests).toHaveLength(1));
  const [request] = fixture.requests;

  expect(new URL(request?.url ?? "").pathname).toBe("/hero-sightings");
  expect(await request?.json()).toMatchObject({
    world: "luvia",
    accountId: "202",
    characterId: "101",
    actorCharacter: { characterId: "101" },
    hero: { name: "Tepeyollotl", lvl: 258, prof: "b" },
    state: "ROAMING",
    mapName: "Oztotl Tzacua p.2 - sala 2",
    observedAt: new Date(NOW - 1000).toISOString(),
  });
  await waitFor(() =>
    expect(useHeroSightingsStore.getState().ownDetection?.sightings).toEqual([
      sighting,
    ]),
  );
  // Reporting never claims on its own; the player decides in the window.
  expect(useWindowsStore.getState()["hero-sightings"].open).toBe(true);
  expect(fixture.requests.some((entry) => entry.url.includes("/claim"))).toBe(
    false,
  );
});

it("ignores chat history re-delivered after a login and other system messages", async () => {
  const fixture = createFixture();

  fixture.handle(
    systemChat(
      answer(502, 10 * 60),
      { ...answer(503), style: 1 },
      { id: 504, msg: "Podział łupów: nikt", style: 4, ts: NOW / 1000 },
    ),
  );
  await settle();

  expect(fixture.requests).toHaveLength(0);
});

it("sends nothing for a character whose catching list is known to be empty", async () => {
  const fixture = createFixture([]);

  fixture.handle(systemChat(answer(505)));
  await settle();

  expect(fixture.requests).toHaveLength(0);
});
