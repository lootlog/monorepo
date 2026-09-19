import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { ImmediateIntersectionObserver } from "@/lib/testing/intersection-observer";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import type { ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { MemberKillsList } from "./member-kills-list";

await initializeTestTranslations();

const wrapper = await createOrganizationTestWrapper();

const renderList = (ui: ReactNode) => render(ui, { wrapper });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MemberKillsList", () => {
  it("shows stable loading, error, and empty states", () => {
    const commonProps = {
      allKills: [],
      eventId: "event-1",
      fetchNextPage: vi.fn(),
      guildId: "guild-1",
      hasNextPage: false,
      isFetchingNextPage: false,
      resetKey: "all",
      scrollElement: document.createElement("div"),
    };

    const { rerender } = renderList(
      <MemberKillsList {...commonProps} isLoading hasError={false} />,
    );

    expect(screen.getByLabelText("events.kills.loading")).toBeTruthy();

    rerender(<MemberKillsList {...commonProps} isLoading={false} hasError />);
    expect(screen.getByText("events.error")).toBeTruthy();

    rerender(
      <MemberKillsList {...commonProps} isLoading={false} hasError={false} />,
    );
    expect(screen.getByText("events.kills.noKills")).toBeTruthy();
  });

  it("shows kills when data arrives after the loading state", () => {
    const commonProps = {
      eventId: "event-1",
      fetchNextPage: vi.fn(),
      guildId: "guild-1",
      hasError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      resetKey: "all",
      scrollElement: document.createElement("div"),
    };

    const { rerender } = renderList(
      <MemberKillsList {...commonProps} allKills={[]} isLoading />,
    );

    rerender(
      <MemberKillsList
        {...commonProps}
        allKills={[createKill()]}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("link")).toBeTruthy();
    expect(screen.getAllByText("Zorin").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("columnheader", { name: "events.kills.monster" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "events.kills.timeCoverage" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", {
        name: "events.kills.trackingDurationTime",
      }),
    ).toBeTruthy();
  });

  it("links to kill details and expands the scoring breakdown separately", () => {
    renderList(
      <MemberKillsList
        allKills={[
          createKill({
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
          }),
        ]}
        eventId="event-1"
        fetchNextPage={vi.fn()}
        guildId="guild-1"
        hasError={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        isLoading={false}
        resetKey="all"
        scrollElement={document.createElement("div")}
      />,
    );

    const link = screen.getByRole("link", {
      name: "events.kills.openKillDetails",
    });

    expect(link.getAttribute("href")).toBe(
      "/guild-1/events/event-1/heroes/hero-1/kills/kill-1",
    );
    expect(link.textContent).toBe("Zorin");
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

    expect(
      screen
        .getByRole("button", { name: "events.kills.collapseBreakdown" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
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

    fireEvent.click(
      screen.getByRole("button", { name: "events.kills.collapseBreakdown" }),
    );

    expect(screen.queryByText("events.kills.scoringBreakdown")).toBeNull();
  });

  it("loads the next page when the table loader approaches the viewport", async () => {
    const fetchNextPage = vi.fn();

    vi.stubGlobal("IntersectionObserver", ImmediateIntersectionObserver);

    renderList(
      <MemberKillsList
        allKills={[createKill()]}
        eventId="event-1"
        fetchNextPage={fetchNextPage}
        guildId="guild-1"
        hasError={false}
        hasNextPage
        isFetchingNextPage={false}
        isLoading={false}
        resetKey="all"
        scrollElement={document.createElement("div")}
      />,
    );

    await waitFor(() => expect(fetchNextPage).toHaveBeenCalledTimes(1));
  });
});

function createKill(
  memberPoint: EventMemberKill["memberPoint"] = null,
): EventMemberKill {
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
    memberPoint,
    minSpawnTimeAtKill: "2026-07-31T01:27:00.000Z",
  };
}
