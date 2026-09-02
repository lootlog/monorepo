// @vitest-environment happy-dom

import { cleanup, render, screen, within } from "@testing-library/react";
import type { TFunction } from "i18next";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import { afterEach, describe, expect, it } from "vitest";
import { MultipliersCard } from "./multipliers-card";

const t = ((key: string, options?: { points?: number }) => {
  if (key === "events.scoring.actionSummary.basePoints") {
    return `[${options?.points}]`;
  }

  if (key === "events.scoring.actionSummary.bonusPoints") {
    return `[+${options?.points}]`;
  }

  return key;
}) as TFunction;

const scoringRules: EventScoringRules = {
  version: 1,
  timezone: "Europe/Warsaw",
  hardCapPoints: 2,
  minTrackingPercentForBonuses: 50,
  rules: [
    {
      id: "applied",
      name: "Applied rule",
      conditions: [],
      action: { type: "SET_BASE", points: 1 },
    },
    {
      id: "neutral",
      name: "Neutral rule",
      conditions: [],
      action: { type: "ADD_BONUS", points: 0.25 },
    },
    {
      id: "disabled",
      name: "Disabled rule",
      enabled: false,
      conditions: [],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
  ],
};

const emptyScoringRules: EventScoringRules = {
  ...scoringRules,
  rules: [],
};

const staticScoringStates: Array<{
  scoringMode: "SIMPLE" | "ADVANCED";
  rules: EventScoringRules | null;
  text: string;
}> = [
  {
    scoringMode: "SIMPLE",
    rules: null,
    text: "events.killDetail.multipliers.simpleMode",
  },
  {
    scoringMode: "ADVANCED",
    rules: emptyScoringRules,
    text: "events.killDetail.multipliers.noRules",
  },
];

afterEach(cleanup);

describe("MultipliersCard", () => {
  it("shows every rule immediately in an accessible list", () => {
    const { container } = render(
      <MultipliersCard
        eventConfig={{ scoringMode: "ADVANCED", scoringRules }}
        highlightedRuleIds={["applied", "disabled"]}
        t={t}
      />,
    );

    expect(container.querySelector("button")).toBeNull();
    const list = screen.getByRole("list", {
      name: "events.killDetail.multipliers.configuredRules",
    });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]?.textContent).toContain("Applied rule");
    expect(within(items[0] as HTMLElement).getByText("[1]")).toBeTruthy();
    expect(within(items[1] as HTMLElement).getByText("[+0.25]")).toBeTruthy();
    expect(within(items[2] as HTMLElement).getByText("[+0.5]")).toBeTruthy();
    const firstItemText = items[0]?.textContent ?? "";
    expect(firstItemText).toContain("events.scoring.always");
    expect(firstItemText.indexOf("events.scoring.always")).toBeLessThan(
      firstItemText.indexOf("[1]"),
    );
    expect(items[0]?.textContent).toContain(
      "events.killDetail.multipliers.appliedStatus",
    );
    expect(items[0]?.className).toContain("before:bg-cyan-400");
    expect(items[1]?.textContent).not.toContain(
      "events.killDetail.multipliers.appliedStatus",
    );
    expect(items[1]?.textContent).not.toContain(
      "events.killDetail.multipliers.disabledStatus",
    );
    expect(items[2]?.textContent).toContain(
      "events.killDetail.multipliers.disabledStatus",
    );
    expect(items[2]?.textContent).not.toContain(
      "events.killDetail.multipliers.appliedStatus",
    );
    expect(screen.queryByText("events.scoring.ifLabel")).toBeNull();
    expect(screen.queryByText("events.scoring.thenLabel")).toBeNull();
    expect(container.textContent).not.toContain(
      "events.killDetail.multipliers.total",
    );
  });

  it("keeps all rules neutral when no applied rule ids are available", () => {
    render(
      <MultipliersCard
        eventConfig={{ scoringMode: "ADVANCED", scoringRules }}
        t={t}
      />,
    );

    expect(screen.getByText("Applied rule")).toBeTruthy();
    expect(screen.getByText("Neutral rule")).toBeTruthy();
    expect(
      screen.queryByText("events.killDetail.multipliers.appliedStatus"),
    ).toBeNull();
    expect(
      screen.getByText("events.killDetail.multipliers.ruleCount"),
    ).toBeTruthy();
  });

  it.each(staticScoringStates)(
    "renders the $scoringMode static state",
    ({ scoringMode, rules, text }) => {
      const { container } = render(
        <MultipliersCard
          eventConfig={{ scoringMode, scoringRules: rules }}
          t={t}
        />,
      );

      expect(screen.getByText(text)).toBeTruthy();
      expect(container.querySelector("button")).toBeNull();
      if (scoringMode === "SIMPLE") {
        expect(
          screen.queryByText("events.killDetail.multipliers.ruleCount"),
        ).toBeNull();
        expect(
          screen.queryByText("events.killDetail.multipliers.capLabel"),
        ).toBeNull();
      } else {
        expect(
          screen.getByText("events.killDetail.multipliers.ruleCount"),
        ).toBeTruthy();
        expect(
          screen.getByText("events.killDetail.multipliers.capLabel"),
        ).toBeTruthy();
      }
    },
  );
});
