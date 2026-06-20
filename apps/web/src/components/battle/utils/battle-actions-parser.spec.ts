import { describe, expect, it } from "vitest";
import { parseActions } from "./battle-actions-parser";

describe("parseActions", () => {
  it("keeps attack actions in payload order instead of sorting them", () => {
    const parsedActions = parseActions([
      { actionType: "+dmg", param: "1000" },
      { actionType: "+legbon_curse", param: "" },
      { actionType: "+acdmg", param: "148" },
      { actionType: "-endest", param: "12,3" },
      { actionType: "+wound", param: "" },
      { actionType: "-dmg", param: "400" },
    ]);

    expect(parsedActions.attackActions.map((action) => action.type)).toEqual([
      "+dmg",
      "+legbon_curse",
      "+acdmg",
      "-endest",
      "+wound",
      "-dmg",
    ]);
  });

  it("keeps spell true damage with spell actions when tspell is present", () => {
    const parsedActions = parseActions([
      { actionType: "tspell", param: "Zdruzgotanie" },
      { actionType: "skillId", param: "39" },
      {
        actionType: "+oth_dmg",
        param: "7813,a,Demodras(84.22%)",
      },
      { actionType: "combo-max", param: "3" },
    ]);

    expect(parsedActions.spellActions.map((action) => action.type)).toEqual([
      "tspell",
      "+oth_dmg",
      "combo-max",
    ]);
  });

  it("keeps -dmga with post-defense attack damage actions", () => {
    const parsedActions = parseActions([
      { actionType: "+dmg", param: "20755" },
      { actionType: "-dmg", param: "20754" },
      { actionType: "-dmga", param: "2137" },
    ]);

    expect(parsedActions.attackActions.map((action) => action.type)).toEqual([
      "+dmg",
      "-dmg",
      "-dmga",
    ]);
  });

  it("keeps new legendary bonus actions with attack actions", () => {
    const parsedActions = parseActions([
      { actionType: "+legbon_frenzy_main", param: "5" },
      { actionType: "+legbon_frenzy_off", param: "5" },
      { actionType: "-legbon_retaliation", param: "" },
    ]);

    expect(parsedActions.attackActions.map((action) => action.type)).toEqual([
      "+legbon_frenzy_main",
      "+legbon_frenzy_off",
      "-legbon_retaliation",
    ]);
  });
});
