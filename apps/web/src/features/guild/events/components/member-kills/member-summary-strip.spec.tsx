// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemberSummaryStrip } from "./member-summary-strip";

await initializeTestTranslations({
  "events.kills.kpiShareOfEventKills":
    "events.kills.kpiShareOfEventKills:{{percentage}}",
  "events.kills.kpiActiveShare": "events.kills.kpiActiveShare:{{percentage}}",
});

afterEach(cleanup);

const contextStats = {
  avgAfkPercentage: 2.5,
  avgPointsPerKill: 1.5,
  avgTimePerKillSeconds: 5160,
  totalKills: 3,
  totalPoints: 4.5,
  totalTimeSeconds: 15_480,
};

describe("MemberSummaryStrip", () => {
  it("relates the member's kills and AFK time to the event", () => {
    render(
      <MemberSummaryStrip
        member={{ avatar: null, name: "Wild", userId: "user-1" }}
        memberId="8112"
        eventName="Wakacje 2026"
        contextStats={contextStats}
        eventKillCount={4}
      />,
    );

    expect(
      screen.getByText("events.kills.kpiShareOfEventKills:75"),
    ).toBeTruthy();
    expect(screen.getByText("events.kills.kpiActiveShare:97.5")).toBeTruthy();
  });

  it("shows the ranking place only when one hero's ranking applies", () => {
    const { rerender } = render(
      <MemberSummaryStrip
        member={{ avatar: null, name: "Wild", userId: "user-1" }}
        memberId="8112"
        eventName="Wakacje 2026"
        contextStats={contextStats}
      />,
    );

    expect(screen.queryByText("events.kills.memberRankingPlace")).toBeNull();

    rerender(
      <MemberSummaryStrip
        member={{ avatar: null, name: "Wild", userId: "user-1" }}
        memberId="8112"
        eventName="Wakacje 2026"
        contextStats={contextStats}
        rankingPlace={{ position: 2, playerCount: 14 }}
      />,
    );

    expect(screen.getByText("events.kills.memberRankingPlace")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("keeps the overview useful without member details or kills", () => {
    render(
      <MemberSummaryStrip
        member={undefined}
        memberId="8112"
        eventName="Wakacje 2026"
        contextStats={{
          avgAfkPercentage: 0,
          avgPointsPerKill: 0,
          avgTimePerKillSeconds: 0,
          totalKills: 0,
          totalPoints: 0,
          totalTimeSeconds: 0,
        }}
        eventKillCount={0}
      />,
    );

    expect(screen.getByRole("heading", { name: "#8112" })).toBeTruthy();
    expect(screen.queryByText(/events.kills.kpiShareOfEventKills/)).toBeNull();
    expect(screen.queryByText(/events.kills.kpiActiveShare/)).toBeNull();
  });
});
