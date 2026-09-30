// @vitest-environment happy-dom
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { createHeroKill } from "@/lib/testing/event-kill";
import type { ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  configureApiClients,
  type ApiServiceConfig,
} from "@lootlog/client/transport";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { RecentKillsPreview } from "./recent-kills-preview";

await initializeTestTranslations();

const RouterWrapper = await createOrganizationTestWrapper();

afterEach(cleanup);

const renderPreview = (
  content: ReactNode,
  fetch: NonNullable<ApiServiceConfig["fetch"]>,
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  onTestFinished(() => queryClient.clear());
  onTestFinished(
    configureApiClients({ main: { baseUrl: "https://api.test", fetch } }),
  );

  return {
    ...render(
      <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>,
      { wrapper: RouterWrapper },
    ),
    queryClient,
  };
};

const recentKillsResponse = () =>
  Promise.resolve(
    Response.json({
      kind: "event",
      data: [createHeroKill()],
      nextCursor: null,
    }),
  );

describe("RecentKillsPreview", () => {
  it("renders the history link in the header and the actual recent kill", async () => {
    renderPreview(
      <RecentKillsPreview guildId="guild-1" eventId="event-1" />,
      recentKillsResponse,
    );

    const viewAllLink = await screen.findByRole("link", {
      name: "events.kills.viewAll",
    });

    expect(viewAllLink.closest("header")).toBeTruthy();
    expect(viewAllLink.getAttribute("href")).toBe(
      "/guild-1/events/event-1/kills",
    );
    expect(viewAllLink.getAttribute("class")).toContain("hover:text-primary");
    expect(viewAllLink.getAttribute("class")).not.toContain("hover:bg-");
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByText("Zorin").length).toBeGreaterThan(0);
  });

  it("keeps the fetched history and header destination on the selected hero", async () => {
    const requests: string[] = [];
    renderPreview(
      <RecentKillsPreview
        guildId="guild-1"
        eventId="event-1"
        heroNpcs={[
          {
            id: "hero-1",
            npcIcon: null,
            npcId: null,
            npcLvl: null,
            npcName: "Zorin",
          },
          {
            id: "hero-2",
            npcIcon: null,
            npcId: null,
            npcLvl: null,
            npcName: "Maddok",
          },
        ]}
        showHeroTabs
      />,
      (input) => {
        requests.push(input instanceof Request ? input.url : String(input));

        return recentKillsResponse();
      },
    );
    expect(
      (
        await screen.findByRole("link", { name: "events.kills.viewAll" })
      ).getAttribute("href"),
    ).toContain("/heroes/hero-1/kills");
    fireEvent.click(screen.getByRole("tab", { name: "Maddok" }));
    await waitFor(() =>
      expect(requests[requests.length - 1]).toContain(
        "/kill-history?limit=5&heroId=hero-2",
      ),
    );
    expect(
      (
        await screen.findByRole("link", { name: "events.kills.viewAll" })
      ).getAttribute("href"),
    ).toContain("/heroes/hero-2/kills");
  });

  it("keeps recent kills visible and recovers from a failed refresh", async () => {
    let shouldFail = false;

    const { queryClient } = renderPreview(
      <RecentKillsPreview guildId="guild-1" eventId="event-1" />,
      () =>
        shouldFail
          ? Promise.resolve(
              Response.json({ message: "Unavailable" }, { status: 503 }),
            )
          : recentKillsResponse(),
    );

    await screen.findAllByText("Zorin");
    shouldFail = true;
    await act(() => queryClient.invalidateQueries());

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getAllByText("Zorin").length).toBeGreaterThan(0);

    shouldFail = false;
    fireEvent.click(
      screen.getByRole("button", { name: "common.actions.retry" }),
    );

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getAllByText("Zorin").length).toBeGreaterThan(0);
  });

  it.each(["loading", "empty", "error"] as const)(
    "keeps the %s state inside the widget without the action",
    async (state) => {
      renderPreview(
        <RecentKillsPreview guildId="guild-1" eventId="event-1" />,
        () => {
          if (state === "loading")
            return new Promise<Response>(() => undefined);

          if (state === "error")
            return Promise.resolve(
              Response.json({ message: "Unavailable" }, { status: 503 }),
            );

          return Promise.resolve(
            Response.json({ kind: "event", data: [], nextCursor: null }),
          );
        },
      );
      expect(
        screen.getByRole("heading", { name: "events.kills.recentTitle" }),
      ).toBeTruthy();

      if (state === "loading")
        expect(screen.getByLabelText("events.kills.loading")).toBeTruthy();
      else
        await screen.findByText(
          state === "error" ? "events.error" : "events.kills.noKills",
        );
      expect(screen.queryByRole("link")).toBeNull();
    },
  );
});
