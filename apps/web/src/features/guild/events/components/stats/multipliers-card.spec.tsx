// @vitest-environment happy-dom

import { cleanup, render, screen, within } from "@testing-library/react";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import { afterEach, describe, expect, it } from "vitest";
import { MultipliersCard } from "./multipliers-card";

const { t } = await initializeTestTranslations({
  "events.scoring.actionSummary.basePoints": "{{points}} pkt",
  "events.scoring.actionSummary.bonusPoints": "+{{points}} pkt",
});

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
  it("groups base rules apart from bonuses and marks the viewer's applied rules", () => {
    const { container } = render(
      <MultipliersCard
        eventConfig={{ scoringMode: "ADVANCED", scoringRules }}
        highlightedRuleIds={["applied", "disabled"]}
        t={t}
      />,
    );

    expect(container.querySelector("button")).toBeNull();

    const baseItems = within(
      screen.getByRole("list", {
        name: "events.killDetail.multipliers.baseGroup",
      }),
    ).getAllByRole("listitem");

    const bonusItems = within(
      screen.getByRole("list", {
        name: "events.killDetail.multipliers.bonusGroup",
      }),
    ).getAllByRole("listitem");

    expect(baseItems).toHaveLength(1);
    expect(bonusItems).toHaveLength(2);

    const [appliedBase] = baseItems;
    const [neutralBonus, disabledBonus] = bonusItems;

    if (!appliedBase || !neutralBonus || !disabledBonus)
      throw new Error("Missing scoring rules");

    expect(appliedBase.textContent).toContain("Applied rule");
    expect(appliedBase.textContent).toContain("events.scoring.always");
    expect(within(appliedBase).getByText("1 pkt")).toBeTruthy();
    expect(appliedBase.textContent).toContain(
      "events.killDetail.multipliers.appliedStatus",
    );

    expect(within(neutralBonus).getByText("+0.25 pkt")).toBeTruthy();
    expect(neutralBonus.textContent).not.toContain(
      "events.killDetail.multipliers.appliedStatus",
    );

    expect(disabledBonus.textContent).toContain(
      "events.killDetail.multipliers.disabledStatus",
    );
    expect(disabledBonus.textContent).not.toContain(
      "events.killDetail.multipliers.appliedStatus",
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

      // Only advanced scoring has rules to count next to the heading.
      const heading = screen.getByRole("heading").textContent;

      if (scoringMode === "SIMPLE") {
        expect(heading).toBe("events.killDetail.multipliers.title");
      } else {
        expect(heading).not.toBe("events.killDetail.multipliers.title");
      }
    },
  );
});
