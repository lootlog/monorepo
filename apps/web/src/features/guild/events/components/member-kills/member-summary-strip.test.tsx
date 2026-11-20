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
      <MemberSummaryStrip contextStats={contextStats} eventKillCount={4} />,
    );

    expect(
      screen.getByText("events.kills.kpiShareOfEventKills:75"),
    ).toBeTruthy();
    expect(screen.getByText("events.kills.kpiActiveShare:97.5")).toBeTruthy();
  });

  it("leaves out the shares while the member has no kills", () => {
    render(
      <MemberSummaryStrip
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

    expect(screen.queryByText(/events.kills.kpiShareOfEventKills/)).toBeNull();
    expect(screen.queryByText(/events.kills.kpiActiveShare/)).toBeNull();
  });
});
