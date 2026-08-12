// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  EventConfig,
  KillDetail,
} from "../../hooks/queries/use-kill-detail";
import { KillDetailSummary } from "./kill-detail-summary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { duration?: string }) =>
      options?.duration ? `${key}:${options.duration}` : key,
  }),
}));

afterEach(cleanup);

describe("KillDetailSummary", () => {
  it("renders the NPC sprite without a rounded background container", () => {
    renderSummary(
      createKill({
        heroNpc: {
          ...createKill().heroNpc,
          npcIcon: "potulny-berserker.gif",
        },
      }),
    );

    const npcContainer = screen.getByRole("img", {
      name: "Potulny Berserker",
    }).parentElement;

    expect(npcContainer?.className).toContain("w-10");
    expect(npcContainer?.className).not.toContain("rounded");
    expect(npcContainer?.className).not.toContain("bg-");
    expect(npcContainer?.className).not.toContain("ring-");
  });

  it("renders an accessible early delta inline with the respawn time", () => {
    renderSummary(createKill());

    const respawnMetric = screen.getByLabelText(
      "events.killDetail.respawnTime: 1h 18m, events.killDetail.respawnFasterBy:41m 48s",
    );
    const maximumWindowMetric = screen.getByLabelText(
      "events.killDetail.respawnWindowTime: 2h",
    );
    const delta = screen.getByText("−41m 48s");
    const valueRow = respawnMetric.querySelector("dd");

    expect(valueRow?.className).toContain("whitespace-nowrap");
    expect(delta.className).toContain("shrink-0");
    expect(delta.getAttribute("aria-hidden")).toBe("true");
    expect(maximumWindowMetric.textContent).not.toContain("−41m 48s");
  });

  it("prioritizes an accessible overdue delta and gives it amber emphasis", () => {
    renderSummary(createKill({ resolvedAfterMaxSpawnTimeMs: 60_000 }));

    const respawnMetric = screen.getByLabelText(
      "events.killDetail.respawnTime: 1h 18m, events.killDetail.overdueBy:1m",
    );
    const maximumWindowMetric = screen.getByLabelText(
      "events.killDetail.respawnWindowTime: 2h",
    );
    const delta = screen.getByText("+1m");

    expect(delta.className).toContain("text-amber-500");
    expect(respawnMetric.textContent).not.toContain("−41m 48s");
    expect(maximumWindowMetric.textContent).not.toContain("+1m");
  });

  it("omits the delta and comparison label without a difference", () => {
    renderSummary(createKill(), { fasterThanMaxText: null });

    expect(
      screen.getByLabelText("events.killDetail.respawnTime: 1h 18m"),
    ).toBeTruthy();
    expect(screen.queryByText("−41m 48s")).toBeNull();
    expect(screen.queryByText("+1m")).toBeNull();
  });
});

function renderSummary(
  kill: KillDetail,
  options: { fasterThanMaxText?: string | null } = {},
) {
  const eventConfig: EventConfig = {
    scoringMode: "ADVANCED",
    scoringRules: null,
  };

  return render(
    <KillDetailSummary
      kill={kill}
      eventConfig={eventConfig}
      participantsCount={3}
      lootCount={1}
      respawnDurationText="1h 18m"
      windowDurationText="2h"
      fasterThanMaxText={
        options.fasterThanMaxText === undefined
          ? "41m 48s"
          : options.fasterThanMaxText
      }
      respawnComparedToMaxPercentage={65}
    />,
  );
}

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
