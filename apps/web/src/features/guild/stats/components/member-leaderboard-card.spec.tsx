// @vitest-environment happy-dom

import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import type { GuildKillStatsResponseDtoOutputMemberRankingItem } from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemberLeaderboardCard } from "./member-leaderboard-card";

await initializeTestTranslations();

const wrapper = await createOrganizationTestWrapper();

const VIEWER_DISCORD_ID = "discord-viewer";

const createMember = (
  place: number,
  memberUserId = `discord-${place}`,
): GuildKillStatsResponseDtoOutputMemberRankingItem => ({
  memberId: place,
  memberName: `Member ${place}`,
  memberAvatar: null,
  memberUserId,
  totalParticipations: 100 - place,
  participationsByType: { TITAN: 100 - place },
});

const renderLeaderboard = (viewerPlace: number) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  queryClient.setQueryData(sessionQueryOptions.queryKey, {
    data: {
      user: {
        id: "user-viewer",
        discordId: VIEWER_DISCORD_ID,
        name: "Viewer",
        email: "viewer@example.test",
        emailVerified: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      session: {
        id: "session-1",
        userId: "user-viewer",
        token: "fixture-token",
        expiresAt: new Date("2099-01-01"),
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    },
    error: null,
  });
  restoreApiClients = configureApiClients({
    main: {
      baseUrl: "https://api.test",
      fetch: async () =>
        new Response("[]", {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    },
  });

  const members = Array.from({ length: 14 }, (_, index) =>
    createMember(
      index + 1,
      index + 1 === viewerPlace ? VIEWER_DISCORD_ID : undefined,
    ),
  );

  render(
    <QueryClientProvider client={queryClient}>
      <MemberLeaderboardCard data={members} npcType="TITAN" guildId="guild-1" />
    </QueryClientProvider>,
    { wrapper },
  );

  return screen.getAllByRole("listitem");
};

let restoreApiClients = () => {};

describe("MemberLeaderboardCard", () => {
  afterEach(() => {
    cleanup();
    restoreApiClients();
  });

  it("follows the leaders with the viewer's own place when it falls outside them", () => {
    const rows = renderLeaderboard(12);

    const ownRow = rows[10];

    expect(rows).toHaveLength(11);
    expect(ownRow?.textContent).toMatch(/^12/);
    expect(ownRow?.textContent).toContain("Member 12");
    expect(ownRow?.getAttribute("aria-current")).toBe("true");
  });

  it("does not repeat the viewer's place when they are among the leaders", () => {
    const rows = renderLeaderboard(4);

    expect(rows).toHaveLength(10);
    expect(rows[3]?.getAttribute("aria-current")).toBe("true");
  });
});
