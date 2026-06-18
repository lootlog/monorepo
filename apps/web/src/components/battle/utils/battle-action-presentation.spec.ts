import { describe, expect, it } from "vitest";
import { getBattleActionPresentation } from "./battle-action-presentation";

describe("getBattleActionPresentation", () => {
  it("uses reduced energy destroy copy when -endest has a second param", () => {
    expect(
      getBattleActionPresentation({
        type: "-endest",
        value: "12,3",
      }),
    ).toEqual({
      i18nKey: "battle.-endest_reduced",
      values: {
        value: "12",
        reducedValue: "3",
      },
    });
  });

  it("keeps regular energy destroy copy when -endest has no reduction", () => {
    expect(
      getBattleActionPresentation({
        type: "-endest",
        value: "12",
      }),
    ).toEqual({
      i18nKey: "battle.-endest",
      values: {
        value: "12",
      },
    });
  });

  it("does not treat comma params on other actions as special energy destroy", () => {
    expect(
      getBattleActionPresentation({
        type: "fire",
        value: "120,30",
      }),
    ).toEqual({
      i18nKey: "battle.fire",
      values: {
        value: "120",
      },
    });
  });

  it("uses reduced wound copy when passive damage has a reduction param", () => {
    expect(
      getBattleActionPresentation({
        type: "wound",
        value: "2817,20",
      }),
    ).toEqual({
      i18nKey: "battle.wound_reduced",
      values: {
        value: "2817",
        reductionPercent: "20",
      },
    });
  });

  it("uses reduced critical wound copy when passive damage has a reduction param", () => {
    expect(
      getBattleActionPresentation({
        type: "critwound",
        value: "703,20",
      }),
    ).toEqual({
      i18nKey: "battle.critwound_reduced",
      values: {
        value: "703",
        reductionPercent: "20",
      },
    });
  });
});
