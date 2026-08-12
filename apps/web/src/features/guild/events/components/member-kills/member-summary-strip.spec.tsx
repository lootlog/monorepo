// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberSummaryStrip } from "./member-summary-strip";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/tiles", () => ({
  NpcTile: ({ npc }: { npc: { name: string } }) => <span>{npc.name}</span>,
}));

afterEach(cleanup);

describe("MemberSummaryStrip", () => {
  it("shows the player, event, KPIs, and hero summary in one readable overview", () => {
    render(
      <MemberSummaryStrip
        member={{ avatar: null, name: "Wild", userId: "user-1" }}
        memberId="8112"
        eventName="Wakacje 2026"
        contextStats={{
          avgAfkPercentage: 0,
          avgPointsPerKill: 1.5,
          avgTimePerKillSeconds: 5160,
          totalKills: 2,
          totalPoints: 3,
          totalTimeSeconds: 10_380,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Wild" })).toBeTruthy();
    expect(screen.getByText("Wakacje 2026")).toBeTruthy();
    expect(screen.getByText("events.kills.kpiKills")).toBeTruthy();
    expect(screen.getByText("events.kills.kpiPoints")).toBeTruthy();
    expect(screen.getByText("events.kills.kpiTotalTime")).toBeTruthy();
    expect(screen.getByText("events.kills.kpiAvgAfk")).toBeTruthy();
    expect(screen.getByText("events.kills.kpiAvgPointsPerKill")).toBeTruthy();
    expect(screen.getByText("events.kills.kpiAvgTimePerKill")).toBeTruthy();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2h 53m").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1.5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1h 26m").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the overview useful when the member has no statistics", () => {
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
      />,
    );

    expect(screen.getByRole("heading", { name: "#8112" })).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("always renders statistics directly after the player header", () => {
    const { container } = render(
      <MemberSummaryStrip
        contextStats={{
          avgAfkPercentage: 0,
          avgPointsPerKill: 1.5,
          avgTimePerKillSeconds: 5160,
          totalKills: 2,
          totalPoints: 3,
          totalTimeSeconds: 10_380,
        }}
        eventName="Wakacje 2026"
        member={{ avatar: null, name: "Wild", userId: "user-1" }}
        memberId="8112"
      />,
    );

    expect(screen.getByRole("heading", { name: "Wild" })).toBeTruthy();
    expect(screen.getByText("events.kills.kpiKills")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("section")?.lastElementChild?.tagName).toBe(
      "DL",
    );
  });
});
