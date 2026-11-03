// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useHeroSightingsControllerGetHeroSightings,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { createElement, type PropsWithChildren } from "react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { createTestGateway } from "@/lib/testing/gateway";
import { useHeroSightingsSocket } from "./use-hero-sightings-socket";

const member = {
  memberId: 1,
  userId: "user-1",
  displayName: "Ala",
  avatarUrl: null,
};

const sighting: HeroSightingResponseDto = {
  id: 10,
  guildId: "one",
  world: "tempest",
  hero: {
    key: "tepeyollotl",
    name: "Tepeyollotl",
    lvl: 258,
    prof: "BLADE_DANCER",
  },
  state: "ROAMING",
  mapName: "Oztotl Tzacua p.2 - sala 2",
  firstSeenAt: "2026-11-03T10:00:00.000Z",
  lastSeenAt: "2026-11-03T10:05:00.000Z",
  spawnedAt: null,
  closedAt: null,
  closeReason: null,
  detectedBy: member,
  detectorCharacter: null,
  lastSeenBy: member,
  claims: [],
};

const otherHero: HeroSightingResponseDto = {
  ...sighting,
  id: 11,
  hero: { key: "mietek", name: "Mietek Żul", lvl: 25, prof: null },
  mapName: "Ithan",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mount = () => {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValue(undefined);

  const fetchSightings = vi.fn(async () =>
    Response.json([sighting, otherHero]),
  );

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({
      main: { baseUrl: "https://api.test", fetch: fetchSightings },
    }),
  );

  const hook = renderHook(
    () => {
      useHeroSightingsSocket({
        socket: gateway.socket,
        guilds: [{ id: "one", vanityUrl: "alias" }],
      });

      return useHeroSightingsControllerGetHeroSightings(
        { guildId: "alias" },
        { world: "tempest" },
      );
    },
    {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(QueryClientProvider, { client }, children),
    },
  );

  const deliver = (payload: HeroSightingResponseDto) =>
    gateway.deliver({
      v: 1,
      type: "hero-sighting.updated",
      data: { organizationId: payload.guildId, payload },
    });

  return { ...hook, deliver, fetchSightings };
};

it("keeps the newest sighting of each hero whatever order a probable kill's updates arrive in", async () => {
  const { result, deliver, fetchSightings } = mount();
  await waitFor(() =>
    expect(result.current.data).toEqual([sighting, otherHero]),
  );

  const replacement: HeroSightingResponseDto = {
    ...sighting,
    id: 12,
    mapName: "Wioska Rybacka",
    firstSeenAt: "2026-11-03T10:20:00.000Z",
    lastSeenAt: "2026-11-03T10:20:00.000Z",
  };

  const closed: HeroSightingResponseDto = {
    ...sighting,
    closedAt: "2026-11-03T10:20:00.000Z",
    closeReason: "PROBABLY_KILLED",
  };

  act(() => {
    deliver(replacement);
    deliver(closed);
    deliver({ ...replacement, world: "other" });
    deliver({ ...replacement, guildId: "two", id: 99 });
  });

  await waitFor(() =>
    expect(result.current.data).toEqual([replacement, otherHero]),
  );

  const claimed: HeroSightingResponseDto = {
    ...replacement,
    claims: [
      { member, character: null, createdAt: "2026-11-03T10:21:00.000Z" },
    ],
  };

  act(() => deliver(claimed));

  await waitFor(() =>
    expect(result.current.data).toEqual([claimed, otherHero]),
  );
  expect(fetchSightings).toHaveBeenCalledOnce();
});
