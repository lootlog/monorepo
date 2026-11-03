// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";
import { HERO_SIGHTING_WRITE_PERMISSION } from "@lootlog/domain/npc-permissions";
import { afterEach, expect, it, onTestFinished } from "vitest";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { HeroSightingClaimButton } from "./hero-sighting-claim-button";
import "@/i18n/config";

const detector = {
  memberId: 1,
  userId: "user-1",
  displayName: "Ala",
  avatarUrl: null,
};

const sighting: HeroSightingResponseDto = {
  id: 10,
  guildId: "guild-1",
  world: "tempest",
  hero: { key: "tepeyollotl", name: "Tepeyollotl", lvl: 258, prof: null },
  state: "ROAMING",
  mapName: "Oztotl Tzacua p.2 - sala 2",
  firstSeenAt: "2026-11-03T10:00:00.000Z",
  lastSeenAt: "2026-11-03T10:05:00.000Z",
  spawnedAt: null,
  closedAt: null,
  closeReason: null,
  detectedBy: detector,
  detectorCharacter: null,
  lastSeenBy: detector,
  claims: [
    {
      member: { ...detector, memberId: 2, userId: "user-2" },
      character: null,
      createdAt: "2026-11-03T10:06:00.000Z",
    },
  ],
};

afterEach(cleanup);

const mount = async (
  capabilities: Permission[],
  shown: HeroSightingResponseDto = sighting,
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  client.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
    capabilities,
  );
  // SAFETY: the claim button reads only the signed-in user's internal id
  // from the session, so the rest of the better-auth session is left out.
  client.setQueryData(sessionQueryOptions.queryKey, {
    data: { user: { id: "user-2", discordId: "discord-2" } },
  } as never);

  const Wrapper = await createOrganizationTestWrapper();

  render(
    <QueryClientProvider client={client}>
      <Wrapper>
        <h1>Board</h1>
        <HeroSightingClaimButton sighting={shown} />
      </Wrapper>
    </QueryClientProvider>,
  );

  // The organization route renders after the router loads.
  await screen.findByRole("heading", { name: "Board" });
};

it("offers no claim to a member who may only read hero sightings", async () => {
  await mount([
    Permission.LOOTLOG_TIMERS_READ,
    Permission.LOOTLOG_TIMERS_HEROES_READ,
  ]);

  expect(screen.queryByRole("button")).toBeNull();
});

it("offers withdrawal to the member whose Lootlog user already claims the hero", async () => {
  await mount([HERO_SIGHTING_WRITE_PERMISSION]);

  expect(await screen.findByRole("button", { name: /Wycofaj/ })).toBeTruthy();
});

it("offers a claim to another member and none on a closed sighting", async () => {
  await mount([HERO_SIGHTING_WRITE_PERMISSION], { ...sighting, claims: [] });

  expect(await screen.findByRole("button", { name: /Obstawiam/ })).toBeTruthy();

  cleanup();
  await mount([HERO_SIGHTING_WRITE_PERMISSION], {
    ...sighting,
    closedAt: "2026-11-03T10:20:00.000Z",
    closeReason: "PROBABLY_KILLED",
  });

  expect(screen.queryByRole("button")).toBeNull();
});
