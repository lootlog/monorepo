import { describe, expect, it } from "vitest";
import {
  getMatchingStatSearchKey,
  type VisibleStatCategory,
} from "./one-vs-one-stats-rows";

const categories: VisibleStatCategory[] = [
  {
    id: "damageTaken",
    label: "Otrzymane obrażenia",
    stats: [
      {
        key: "woundDamageTaken",
        labelKey: "battleUi.oneVsOne.stats.woundDamageTaken",
        label: "Głęboka rana",
      },
    ],
  },
];

describe("battle statistics search", () => {
  it.each(["gleboka rana", "GŁĘBOKA RANA", "  GLEBOKA   RANA  "])(
    "finds a Polish stat label using %s",
    (query) => {
      expect(getMatchingStatSearchKey(query, categories)).toBe(
        "stat:woundDamageTaken",
      );
    },
  );
});
