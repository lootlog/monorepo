import { initializeTestTranslations } from "@/lib/testing/i18n";
// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { KillDetail } from "../../hooks/queries/use-kill-detail";
import { KillDetailSummary } from "./kill-detail-summary";

await initializeTestTranslations({
  "events.killDetail.overdueBy": "events.killDetail.overdueBy:{{duration}}",
  "events.killDetail.windowShare":
    "events.killDetail.windowShare:{{percentage}}",
});

afterEach(cleanup);

describe("KillDetailSummary", () => {
  it("reports how much of the respawn window passed before the kill", () => {
    render(<KillDetailSummary kill={createKill()} heroProf={null} />);

    expect(
      screen.getByLabelText(
        "events.killDetail.respawnTime: 1h 18m, events.killDetail.windowShare:65",
      ),
    ).toBeTruthy();
  });

  it("reports an overdue kill instead of its window share", () => {
    render(
      <KillDetailSummary
        kill={createKill({ resolvedAfterMaxSpawnTimeMs: 60_000 })}
        heroProf={null}
      />,
    );

    const gauge = screen.getByLabelText(/^events.killDetail.respawnTime:/);

    expect(gauge.getAttribute("aria-label")).toBe(
      "events.killDetail.respawnTime: 1h 18m, events.killDetail.overdueBy:1m",
    );
  });

  it("derives the timing from the window timestamps for kills without stored durations", () => {
    render(
      <KillDetailSummary
        kill={createKill({
          respawnDurationSeconds: null,
          windowDurationSeconds: null,
        })}
        heroProf={null}
      />,
    );

    expect(
      screen.getByLabelText(
        "events.killDetail.respawnTime: 1h 18m, events.killDetail.windowShare:65",
      ),
    ).toBeTruthy();
  });
});

function createKill(overrides: Partial<KillDetail> = {}): KillDetail {
  return {
    id: "kill-1",
    heroNpcId: "hero-1",
    killedAt: "2026-08-12T09:18:12.000Z",
    minSpawnTimeAtKill: "2026-08-12T08:00:00.000Z",
    maxSpawnTimeAtKill: "2026-08-12T10:00:00.000Z",
    respawnDurationSeconds: 4_692,
    windowDurationSeconds: 7_200,
    resolvedAfterMaxSpawnTimeMs: null,
    timerCreatedById: null,
    timerCreatedBy: null,
    isManualClose: false,
    points: [],
    heroNpc: {
      id: "hero-1",
      npcId: 123,
      npcLvl: 284,
      npcName: "Potulny Berserker",
      npcIcon: null,
      event: { id: "event-1", name: "Event", world: "tempest" },
    },
    ...overrides,
  };
}
