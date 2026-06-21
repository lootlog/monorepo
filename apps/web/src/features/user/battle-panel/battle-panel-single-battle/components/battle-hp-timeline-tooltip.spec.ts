import { describe, expect, it } from "vitest";
import {
  buildBattleHpTimelineTooltipData,
  buildBattleHpTimelineTooltipLegendaryBonusesByTurn,
  formatBattleHpTimelineTooltipNumber,
  getBattleHpTimelineTooltipPayload,
} from "./battle-hp-timeline-tooltip";

type BattleHpTimelineTooltipTurn = Parameters<
  typeof buildBattleHpTimelineTooltipData
>[0];

const createTurn = (
  overrides: Partial<BattleHpTimelineTooltipTurn> = {},
): BattleHpTimelineTooltipTurn => ({
  turn: 7,
  teamHp: {
    "1": 72.24,
    "2": 41.99,
  },
  deltas: {
    damage: 1240,
    healing: 0,
    mitigation: 180.5,
    resourcePressure: 12,
    energyPressure: 0,
    manaPressure: 0,
    byWarrior: {},
  },
  flags: ["damage", "freeze", "unknownFlag"],
  ...overrides,
});

describe("battle HP timeline tooltip", () => {
  it("builds compact tooltip data for a timeline turn", () => {
    expect(buildBattleHpTimelineTooltipData(createTurn())).toEqual({
      turn: 7,
      team1: 72.24,
      team2: 41.99,
      momentum: 30.3,
      deltas: [
        {
          key: "damage",
          labelKey: "battlePanel.single.chart.tooltip.damage",
          value: 1240,
        },
        {
          key: "mitigation",
          labelKey: "battlePanel.single.chart.tooltip.mitigation",
          value: 180.5,
        },
      ],
      legendaryBonuses: [],
      flagLabelKeys: [
        "battlePanel.single.flags.damage",
        "battlePanel.single.flags.freeze",
      ],
    });
  });

  it("omits zero deltas and unknown flags", () => {
    const tooltipData = buildBattleHpTimelineTooltipData(
      createTurn({
        deltas: {
          damage: 0,
          healing: 0,
          mitigation: 0,
          resourcePressure: 0,
          energyPressure: 0,
          manaPressure: 0,
          byWarrior: {},
        },
        flags: ["unknownFlag"],
      }),
    );

    expect(tooltipData.deltas).toEqual([]);
    expect(tooltipData.flagLabelKeys).toEqual([]);
  });

  it("groups legendary bonuses by turn for tooltip payloads", () => {
    const legendaryBonusesByTurn =
      buildBattleHpTimelineTooltipLegendaryBonusesByTurn([
        {
          turn: 7,
          team: 1,
          bonuses: [
            {
              labelKey: "battlePanel.single.chart.legendary.frenzy",
              recipientName: "Kamik",
              color: "#ef4444",
            },
          ],
        },
        {
          turn: 8,
          team: 2,
          bonuses: [
            {
              labelKey: "battlePanel.single.chart.legendary.glare",
              recipientName: null,
              color: "#facc15",
            },
          ],
        },
      ]);

    expect(
      buildBattleHpTimelineTooltipData(
        createTurn(),
        legendaryBonusesByTurn.get(7),
      ).legendaryBonuses,
    ).toEqual([
      {
        labelKey: "battlePanel.single.chart.legendary.frenzy",
        recipientName: "Kamik",
        team: 1,
        color: "#ef4444",
      },
    ]);
  });

  it("extracts tooltip data from a Recharts payload object", () => {
    const tooltipData = buildBattleHpTimelineTooltipData(createTurn());

    expect(getBattleHpTimelineTooltipPayload(tooltipData)).toEqual(tooltipData);
    expect(getBattleHpTimelineTooltipPayload({ turn: "bad" })).toBeNull();
    expect(getBattleHpTimelineTooltipPayload(null)).toBeNull();
  });

  it("formats numbers with at most one decimal place", () => {
    expect(formatBattleHpTimelineTooltipNumber(10)).toBe("10");
    expect(formatBattleHpTimelineTooltipNumber(10.04)).toBe("10");
    expect(formatBattleHpTimelineTooltipNumber(10.05)).toBe("10,1");
    expect(formatBattleHpTimelineTooltipNumber(-3.24)).toBe("-3,2");
  });
});
