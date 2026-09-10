import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { ImmediateIntersectionObserver } from "@/lib/testing/intersection-observer";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    memberPoint: null,
    minSpawnTimeAtKill: "2026-07-31T01:27:00.000Z",
  };
}
