// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { EventKillRow } from "./event-kill-row";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    className,
  }: {
    children: ReactNode;
    params: Record<string, string>;
    className?: string;
  }) => (
    <a
      href={`/${params.guildId}/events/${params.eventId}/heroes/${params.heroId}/kills/${params.killId}`}
      className={className}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/tiles", () => ({
  NpcTile: ({ npc }: { npc: { name: string } }) => <span>{npc.name}</span>,
}));

afterEach(cleanup);

describe("EventKillRow", () => {
  it("links to details and presents respawn and participant data", () => {
    render(
      <EventKillRow kill={createKill()} guildId="guild-1" eventId="event-1" />,
    );

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/guild-1/events/event-1/heroes/hero-1/kills/kill-1",
    );
    expect(screen.getAllByText("Zorin").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("events.kills.respawnTime")).toBeTruthy();
    expect(screen.queryByText("events.kills.respawnTime")).toBeNull();
    expect(screen.getByText("15m")).toBeTruthy();
    expect(screen.getByText("events.kills.participants")).toBeTruthy();
  });

  it("shows the manual-close status instead of respawn time", () => {
    render(
      <EventKillRow
        kill={createKill({ isManualClose: true })}
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByText("events.kills.manualCloseLabel")).toBeTruthy();
    expect(screen.queryByText("events.kills.respawnTime")).toBeNull();
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
    points: [],
  };
}
