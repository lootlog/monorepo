// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { EventKillsTable } from "./event-kills-table";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    ...props
  }: {
    children: ReactNode;
    params: Record<string, string>;
  }) => (
    <a
      href={`/${params.guildId}/events/${params.eventId}/heroes/${params.heroId}/kills/${params.killId}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/tiles", () => ({
  NpcTile: ({ npc }: { npc: { name: string } }) => <span>{npc.name}</span>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EventKillsTable", () => {
  const defaultProps = {
    eventId: "event-1",
    fetchNextPage: vi.fn(),
    guildId: "guild-1",
    hasError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    resetKey: "all",
    scrollElement: document.createElement("div"),
  };

  it("shows stable loading, error, and empty states", () => {
    const { rerender } = render(
      <EventKillsTable {...defaultProps} kills={[]} isLoading />,
    );

    expect(screen.getByLabelText("events.kills.loading")).toBeTruthy();

    rerender(
      <EventKillsTable
        {...defaultProps}
        kills={[]}
        isLoading={false}
        hasError
      />,
    );
    expect(screen.getByText("events.error")).toBeTruthy();

    rerender(
      <EventKillsTable {...defaultProps} kills={[]} isLoading={false} />,
    );
    expect(screen.getByText("events.kills.noKills")).toBeTruthy();
  });

  it("renders responsive columns, kill data, and detail links", () => {
    render(<EventKillsTable {...defaultProps} kills={[createKill()]} />);

    expect(screen.getByRole("table").getAttribute("class")).toContain(
      "table-auto xl:table-fixed",
    );
    expect(
      screen.getByRole("columnheader", { name: "events.kills.monster" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("columnheader", { name: "events.kills.date" })
        .getAttribute("class"),
    ).toContain("sm:table-cell");
    expect(
      screen
        .getByRole("columnheader", { name: "events.kills.respawnTime" })
        .getAttribute("class"),
    ).toContain("xl:table-cell");
    expect(
      screen
        .getByRole("columnheader", { name: "events.kills.participants" })
        .getAttribute("class"),
    ).toContain("lg:table-cell");
    expect(
      screen.queryByRole("columnheader", { name: "events.kills.actions" }),
    ).toBeNull();
    expect(screen.getByText("15m")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getAllByText("Zorin").length).toBeGreaterThan(0);

    const detailLinks = screen.getAllByRole("link", {
      name: "events.kills.openKillDetails",
    });
    expect(detailLinks).toHaveLength(1);
    expect(detailLinks[0]?.getAttribute("href")).toBe(
      "/guild-1/events/event-1/heroes/hero-1/kills/kill-1",
    );
    expect(document.querySelector(".lucide-external-link")).toBeNull();
  });

  it("shows the manual-close label instead of a respawn duration", () => {
    render(
      <EventKillsTable
        {...defaultProps}
        kills={[createKill({ isManualClose: true })]}
      />,
    );

    expect(screen.getByText("events.kills.manualCloseLabel")).toBeTruthy();
    expect(screen.queryByText("15m")).toBeNull();
  });

  it("loads the next page when the sentinel approaches the viewport", async () => {
    const fetchNextPage = vi.fn();

    vi.stubGlobal(
      "IntersectionObserver",
      class IntersectionObserverMock {
        private readonly callback: IntersectionObserverCallback;

        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
        }

        observe = () => {
          this.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        };

        disconnect = vi.fn();
      },
    );

    render(
      <EventKillsTable
        {...defaultProps}
        kills={[createKill()]}
        hasNextPage
        fetchNextPage={fetchNextPage}
      />,
    );

    await waitFor(() => expect(fetchNextPage).toHaveBeenCalledOnce());
    expect(
      screen.queryByRole("button", { name: "events.kills.loadMore" }),
    ).toBeNull();
  });

  it("renders preview rows without infinite-scroll behavior or a terminal row", () => {
    const observer = vi.fn();
    vi.stubGlobal("IntersectionObserver", observer);

    render(
      <EventKillsTable
        variant="preview"
        eventId="event-1"
        guildId="guild-1"
        hasError={false}
        isLoading={false}
        kills={[createKill()]}
      />,
    );

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.queryByText("events.kills.endOfList")).toBeNull();
    expect(screen.queryByText("events.kills.loading")).toBeNull();
    expect(observer).not.toHaveBeenCalled();
  });

  it("preserves rows and disables observation after a pagination error", () => {
    const observer = vi.fn();
    vi.stubGlobal("IntersectionObserver", observer);

    render(
      <EventKillsTable
        {...defaultProps}
        kills={[createKill()]}
        hasError
        hasNextPage
      />,
    );

    expect(screen.getAllByText("Zorin").length).toBeGreaterThan(0);
    expect(screen.getByText("events.error")).toBeTruthy();
    expect(observer).not.toHaveBeenCalled();
  });

  it("resets the scroll position after the hero filter changes", () => {
    const scrollElement = document.createElement("div");
    scrollElement.scrollTo = vi.fn();
    const { rerender } = render(
      <EventKillsTable
        {...defaultProps}
        kills={[createKill()]}
        scrollElement={scrollElement}
      />,
    );

    rerender(
      <EventKillsTable
        {...defaultProps}
        kills={[createKill()]}
        resetKey="hero-1"
        scrollElement={scrollElement}
      />,
    );

    expect(scrollElement.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });
});

function createKill({
  isManualClose = false,
}: {
  isManualClose?: boolean;
} = {}): HeroKill {
  return {
    heroNpc: {
      id: "hero-1",
      npcIcon: "zorin.gif",
      npcId: 123,
      npcLvl: 100,
      npcName: "Zorin",
    },
    heroNpcId: "hero-1",
    id: "kill-1",
    isManualClose,
    killedAt: "2026-07-31T01:15:00.000Z",
    maxSpawnTimeAtKill: "2026-07-31T02:00:00.000Z",
    minSpawnTimeAtKill: "2026-07-31T01:00:00.000Z",
    points: [{ id: "point-1" }, { id: "point-2" }] as HeroKill["points"],
  };
}
