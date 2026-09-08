// @vitest-environment happy-dom
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import type { EventHeroStatsResponseDto } from "@lootlog/client/main";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { createEventOverview } from "@/lib/testing/event";
import { EventKillsHistoryContent } from "./event-kills-history-content";

await initializeTestTranslations();
afterEach(cleanup);

describe("EventKillsHistoryContent", () => {
  it("derives exact all-hero and selected-hero kill counts from one event query", async () => {
    const heroes = [
      { id: "hero-1", npcName: "Zorin", npcId: 1, npcIcon: null, npcLvl: 100 },
      { id: "hero-2", npcName: "Maddok", npcId: 2, npcIcon: null, npcLvl: 200 },
    ];
    const stats: EventHeroStatsResponseDto[] = heroes.map((hero, index) => ({
      heroId: hero.id,
      npcName: hero.npcName,
      npcId: hero.npcId,
      npcLvl: hero.npcLvl,
      npcProf: null,
      killCount: index === 0 ? 3 : 7,
    }));
    const requests: URL[] = [];
    onTestFinished(
      configureApiClients({
        main: {
          baseUrl: "https://api.test",
          fetch: async (input) => {
            const url = new URL(
              input instanceof Request ? input.url : input.toString(),
            );
            requests.push(url);
            if (url.pathname.endsWith("/hero-stats"))
              return Response.json(stats);
            if (url.pathname.endsWith("/participation-confirmations/pending"))
              return Response.json({ items: [], expiredItems: [] });
            if (url.pathname.endsWith("/kills"))
              return Response.json({ data: [], nextCursor: null });
            if (url.pathname.endsWith("/overview"))
              return Response.json(createEventOverview({ heroNpcs: heroes }));
            throw new Error(`Unexpected request: ${url.pathname}`);
          },
        },
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    onTestFinished(() => client.clear());
    render(
      <QueryClientProvider client={client}>
        <EventKillsHistoryContent guildId="guild-1" eventId="event-1" />
      </QueryClientProvider>,
      { wrapper: await createOrganizationTestWrapper() },
    );
    expect(await screen.findByText("10")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Maddok" }));
    expect(await screen.findByText("7")).toBeTruthy();
    expect(
      requests
        .filter((url) => url.pathname.endsWith("/hero-stats"))
        .map((url) => url.pathname),
    ).toEqual(["/guilds/guild-1/events/event-1/hero-stats"]);
  });
});
