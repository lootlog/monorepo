import { describe, expect, it } from "vitest";
import {
  buildLegendaryBonusMarkerGroups,
  getLegendaryBonusLegendItems,
  getLegendaryBonusMarkerDefinition,
  isChartVisibleLegendaryBonusTimelineAction,
  isLegendaryBonusTimelineAction,
} from "./battle-hp-timeline-legendary-markers";

describe("legendary bonus timeline markers", () => {
  it("detects legendary actions by category and legacy legbon action type", () => {
    expect(
      isLegendaryBonusTimelineAction({
        actionType: "unknown_legendary",
        category: "legendary",
        actorId: "1",
        targetId: "2",
        param: "",
      }),
    ).toBe(true);

    expect(
      isLegendaryBonusTimelineAction({
        actionType: "legbon_holytouch_heal",
        category: "healing",
        actorId: "1",
        targetId: "2",
        param: "100",
      }),
    ).toBe(true);
  });

  it("maps action types to marker definitions", () => {
    expect(getLegendaryBonusMarkerDefinition("+legbon_curse").type).toBe(
      "curse",
    );
    expect(getLegendaryBonusMarkerDefinition("+legbon_frenzy_main").type).toBe(
      "frenzy",
    );
    expect(getLegendaryBonusMarkerDefinition("+legbon_frenzy_off").type).toBe(
      "frenzy",
    );
    expect(getLegendaryBonusMarkerDefinition("-legbon_retaliation").type).toBe(
      "retaliation",
    );
    expect(getLegendaryBonusMarkerDefinition("+not_mapped").type).toBe(
      "legendary",
    );
  });

  it("detects hidden legendary bonuses but hides them from chart markers", () => {
    const actions = [
      {
        actionType: "+legbon_puncture",
        category: "legendary",
        actorId: "1",
        targetId: "2",
        param: "",
      },
      {
        actionType: "-legbon_critred",
        category: "legendary",
        actorId: "1",
        targetId: "2",
        param: "50",
      },
      {
        actionType: "-legbon_facade",
        category: "legendary",
        actorId: "1",
        targetId: "2",
        param: "50",
      },
      {
        actionType: "legbon_holytouch_heal",
        category: "healing",
        actorId: "1",
        targetId: "2",
        param: "5359",
      },
    ];

    for (const action of actions) {
      expect(isLegendaryBonusTimelineAction(action)).toBe(true);
      expect(isChartVisibleLegendaryBonusTimelineAction(action)).toBe(false);
    }
  });

  it("groups multiple legendary bonuses from the same turn and team", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 5,
          teamHp: { "1": 72, "2": 48 },
          actions: [
            {
              actionType: "+legbon_curse",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "",
            },
            {
              actionType: "+legbon_verycrit",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "",
            },
          ],
        },
      ],
      [{ originalId: "1", name: "Attacker", team: 1 }],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ turn: 5, team: 1, y: 72 });
    expect(groups[0]?.bonuses.map((bonus) => bonus.type)).toEqual([
      "curse",
      "veryCrit",
    ]);
    expect(groups[0]?.bonuses.map((bonus) => bonus.recipientName)).toEqual([
      "Attacker",
      "Attacker",
    ]);
  });

  it("groups frenzy activations under a shared legend item", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 6,
          teamHp: { "1": 69, "2": 31 },
          actions: [
            {
              actionType: "+legbon_frenzy_main",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "5",
            },
            {
              actionType: "+legbon_frenzy_off",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "5",
            },
          ],
        },
      ],
      [{ originalId: "1", name: "Attacker", team: 1 }],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ turn: 6, team: 1, y: 69 });
    expect(groups[0]?.bonuses.map((bonus) => bonus.type)).toEqual([
      "frenzy",
      "frenzy",
    ]);
    expect(
      getLegendaryBonusLegendItems(groups).map((item) => item.type),
    ).toEqual(["frenzy"]);
  });

  it("uses target team when actor team is unavailable", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 3,
          teamHp: { "1": 90, "2": 65 },
          actions: [
            {
              actionType: "-legbon_glare",
              category: "legendary",
              actorId: "missing",
              targetId: "2",
              param: "",
            },
          ],
        },
      ],
      [{ originalId: "2", team: 2 }],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ turn: 3, team: 2, y: 65 });
  });

  it("places fiery cleanse on defender team", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 24,
          teamHp: { "1": 18.6, "2": 57.62 },
          actions: [
            {
              actionType: "-legbon_cleanse",
              category: "legendary",
              actorId: "attacker",
              targetId: "defender",
              param: "",
            },
          ],
        },
      ],
      [
        { originalId: "attacker", name: "zpwrama", team: 1 },
        { originalId: "defender", name: "Demodras", team: 2 },
      ],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ turn: 24, team: 2, y: 57.62 });
    expect(groups[0]?.bonuses[0]?.type).toBe("cleanse");
    expect(groups[0]?.bonuses[0]?.recipientName).toBe("Demodras");
  });

  it("places glare on defender team", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 34,
          teamHp: { "1": 60.64, "2": 90.76 },
          actions: [
            {
              actionType: "-legbon_glare",
              category: "legendary",
              actorId: "attacker",
              targetId: "defender",
              param: "",
            },
          ],
        },
      ],
      [
        { originalId: "attacker", name: "Demodras", team: 2 },
        { originalId: "defender", name: "zpwrama", team: 1 },
      ],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ turn: 34, team: 1, y: 60.64 });
    expect(groups[0]?.bonuses[0]?.type).toBe("glare");
    expect(groups[0]?.bonuses[0]?.recipientName).toBe("zpwrama");
  });

  it("places retaliation on defender team", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 35,
          teamHp: { "1": 54.2, "2": 88.4 },
          actions: [
            {
              actionType: "-legbon_retaliation",
              category: "legendary",
              actorId: "attacker",
              targetId: "defender",
              param: "",
            },
          ],
        },
      ],
      [
        { originalId: "attacker", name: "Demodras", team: 2 },
        { originalId: "defender", name: "zpwrama", team: 1 },
      ],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ turn: 35, team: 1, y: 54.2 });
    expect(groups[0]?.bonuses[0]?.type).toBe("retaliation");
    expect(groups[0]?.bonuses[0]?.recipientName).toBe("zpwrama");
  });

  it("places last heal on the warrior team from action param", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 9,
          teamHp: { "1": 61, "2": 92 },
          actions: [
            {
              actionType: "legbon_lastheal",
              category: "healing",
              actorId: "attacker",
              targetId: null,
              param: "39030,Demodras(61.00%)",
            },
          ],
        },
      ],
      [
        { originalId: "attacker", name: "Benjamin Netanyahu", team: 2 },
        { originalId: "defender", name: "Demodras", team: 1 },
      ],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ turn: 9, team: 1, y: 61 });
    expect(groups[0]?.bonuses[0]?.type).toBe("lastHeal");
    expect(groups[0]?.bonuses[0]?.recipientName).toBe("Demodras");
  });

  it("places last heal on target team when param name is unavailable", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 10,
          teamHp: { "1": 75, "2": 28 },
          actions: [
            {
              actionType: "legbon_lastheal",
              category: "healing",
              actorId: "attacker",
              targetId: "defender",
              param: "39030",
            },
          ],
        },
      ],
      [
        { originalId: "attacker", name: "Attacker", team: 1 },
        { originalId: "defender", name: "Defender", team: 2 },
      ],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ turn: 10, team: 2, y: 28 });
    expect(groups[0]?.bonuses[0]?.recipientName).toBe("Defender");
  });

  it("omits hidden defensive bonuses when they appear with another legendary bonus", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 7,
          teamHp: { "1": 42, "2": 88 },
          actions: [
            {
              actionType: "-legbon_critred",
              category: "legendary",
              actorId: "2",
              targetId: "1",
              param: "50",
            },
            {
              actionType: "-legbon_facade",
              category: "legendary",
              actorId: "2",
              targetId: "1",
              param: "50",
            },
            {
              actionType: "+legbon_curse",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "",
            },
          ],
        },
      ],
      [{ originalId: "1", team: 1 }],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.bonuses.map((bonus) => bonus.type)).toEqual(["curse"]);
  });

  it("does not create markers or legend items for hidden defensive bonus only fights", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 2,
          teamHp: { "1": 80, "2": 80 },
          actions: [
            {
              actionType: "-legbon_critred",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "40",
            },
            {
              actionType: "-legbon_facade",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "40",
            },
            {
              actionType: "legbon_holytouch_heal",
              category: "healing",
              actorId: "1",
              targetId: "2",
              param: "5359",
            },
          ],
        },
      ],
      [{ originalId: "1", team: 1 }],
    );

    expect(groups).toHaveLength(0);
    expect(getLegendaryBonusLegendItems(groups)).toHaveLength(0);
  });

  it("does not create markers or legend items for puncture only fights", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 4,
          teamHp: { "1": 63, "2": 37 },
          actions: [
            {
              actionType: "+legbon_puncture",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "",
            },
          ],
        },
      ],
      [{ originalId: "1", team: 1 }],
    );

    expect(groups).toHaveLength(0);
    expect(getLegendaryBonusLegendItems(groups)).toHaveLength(0);
  });

  it("shows holy touch activation without showing holy touch healing ticks", () => {
    const groups = buildLegendaryBonusMarkerGroups(
      [
        {
          turn: 12,
          teamHp: { "1": 85, "2": 42 },
          actions: [
            {
              actionType: "+legbon_holytouch",
              category: "legendary",
              actorId: "1",
              targetId: "2",
              param: "",
            },
            {
              actionType: "legbon_holytouch_heal",
              category: "healing",
              actorId: "1",
              targetId: "1",
              param: "5359",
            },
          ],
        },
      ],
      [{ originalId: "1", name: "Demodras", team: 1 }],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.bonuses.map((bonus) => bonus.actionType)).toEqual([
      "+legbon_holytouch",
    ]);
    expect(
      getLegendaryBonusLegendItems(groups).map((item) => item.type),
    ).toEqual(["holyTouch"]);
  });
});
