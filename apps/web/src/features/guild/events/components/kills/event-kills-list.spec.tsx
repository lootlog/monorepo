// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { EventKillsList } from "./event-kills-list";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("./event-kill-row", () => ({
  EventKillRow: ({ kill }: { kill: HeroKill }) => <div>{kill.id}</div>,
}));

afterEach(cleanup);

describe("EventKillsList", () => {
  const defaultProps = {
    eventId: "event-1",
    fetchNextPage: vi.fn(),
    guildId: "guild-1",
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  };

  it("shows the loading state", () => {
    const { container } = render(
      <EventKillsList {...defaultProps} kills={[]} isLoading />,
    );

    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("shows the empty state", () => {
    render(<EventKillsList {...defaultProps} kills={[]} />);

    expect(screen.getByText("events.kills.noKills")).toBeTruthy();
  });

  it("renders rows and the end-of-list message", () => {
    render(<EventKillsList {...defaultProps} kills={[createKill()]} />);

    expect(screen.getByText("kill-1")).toBeTruthy();
    expect(screen.getByText("events.kills.endOfList")).toBeTruthy();
  });

  it("loads the next page on request", () => {
    const fetchNextPage = vi.fn();
    render(
      <EventKillsList
        {...defaultProps}
        kills={[createKill()]}
        hasNextPage
        fetchNextPage={fetchNextPage}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "events.kills.loadMore" }),
    );

    expect(fetchNextPage).toHaveBeenCalledOnce();
  });
});

function createKill(): HeroKill {
  return {
    heroNpc: {
      id: "hero-1",
      npcIcon: null,
      npcId: 123,
      npcLvl: 100,
      npcName: "Zorin",
    },
    heroNpcId: "hero-1",
    id: "kill-1",
    isManualClose: false,
    killedAt: "2026-07-31T01:15:00.000Z",
    maxSpawnTimeAtKill: "2026-07-31T02:00:00.000Z",
    minSpawnTimeAtKill: "2026-07-31T01:00:00.000Z",
    points: [],
  };
}
