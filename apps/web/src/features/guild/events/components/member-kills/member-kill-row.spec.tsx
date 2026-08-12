// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { MemberKillRow } from "./member-kill-row";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode;
    params: Record<string, string>;
    "aria-label"?: string;
  }) => (
    <a
      href={`/${params.guildId}/events/${params.eventId}/heroes/${params.heroId}/kills/${params.killId}`}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/tiles", () => ({
  NpcTile: ({ npc }: { npc: { name: string } }) => <span>{npc.name}</span>,
}));

afterEach(cleanup);

describe("MemberKillRow", () => {
  it("links to kill details and expands the scoring breakdown separately", () => {
    render(
      <table>
        <tbody>
          <MemberKillRow
            guildId="guild-1"
            eventId="event-1"
            kill={createKill()}
          />
        </tbody>
      </table>,
    );

    const link = screen.getByRole("link", {
      name: "events.kills.openKillDetails",
    });

    expect(link.getAttribute("href")).toBe(
      "/guild-1/events/event-1/heroes/hero-1/kills/kill-1",
    );
    expect(link.textContent).toBe("Zorin");
    expect(link.querySelector("svg")).toBeTruthy();
    expect(screen.getAllByText("Zorin").length).toBeGreaterThan(0);
    expect(screen.getByText("1.5")).toBeTruthy();
    expect(screen.getByLabelText("events.points.modified")).toBeTruthy();
    expect(screen.queryByText("events.kills.manualClose")).toBeNull();
    expect(
      screen.queryByText("events.kills.pointsTooltip.basePoints"),
    ).toBeNull();

    const expandButton = screen.getByRole("button", {
      name: "events.kills.expandBreakdown",
    });
    fireEvent.click(expandButton);

    expect(link.getAttribute("href")).toBe(
      "/guild-1/events/event-1/heroes/hero-1/kills/kill-1",
    );
    expect(expandButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("events.kills.scoringBreakdown")).toBeTruthy();
    expect(screen.getByText("events.kills.manualClose")).toBeTruthy();
    expect(screen.getByText("events.points.modified")).toBeTruthy();
    expect(
      screen.getByText("events.kills.pointsTooltip.basePoints"),
    ).toBeTruthy();
    expect(
      screen.getByText("events.kills.pointsTooltip.bonusTotal"),
    ).toBeTruthy();
    expect(
      screen.getByText("events.kills.pointsTooltip.manualAdjustment"),
    ).toBeTruthy();
    expect(
      screen
        .getByText("events.kills.scoringBreakdown")
        .closest("tr")
        ?.getAttribute("data-state"),
    ).toBe("expanded-detail");
  });
});

function createKill(): EventMemberKill {
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
    isManualClose: true,
    killedAt: "2026-07-31T01:27:00.000Z",
    maxSpawnTimeAtKill: "2026-07-31T01:27:00.000Z",
    memberPoint: {
      basePoints: 1,
      bonusBreakdown: null,
      afkPercentage: 0,
      id: "point-1",
      manualAdjustmentPoints: 0.25,
      member: {
        avatar: null,
        id: 8112,
        name: "Wild",
        userId: "user-1",
      },
      memberId: 8112,
      points: 1.5,
      timeOnMapSeconds: 10_320,
      trackingDurationPercentage: 70,
      trackingDurationSeconds: 10_320,
      wasPresent: true,
    },
    minSpawnTimeAtKill: "2026-07-31T01:27:00.000Z",
  };
}
