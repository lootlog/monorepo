import { expect, test } from "bun:test";
import {
  hasItemStat,
  itemStatRecord,
  itemStatValue,
  joinItemStat,
  splitItemStat,
  withoutItemStat,
} from "./item-stat.js";

const odd =
  "lvl=5;opis=a=b;;bound;=x;created=1;lvl=6;gold=;amount=2;rarity=heroic";

test("splitItemStat keeps entry text and order and drops keyless entries", () => {
  expect(splitItemStat(odd)).toEqual({
    revision: "lvl=5;bound;lvl=6;rarity=heroic",
    instance: "opis=a=b;created=1;gold=;amount=2",
  });
  expect(splitItemStat("lvl=5")).toEqual({ revision: "lvl=5", instance: null });
  expect(joinItemStat("lvl=5", null)).toBe("lvl=5");
  expect(joinItemStat("", "gold=1")).toBe("gold=1");
});

test("the persisted stats snapshot keeps the last value up to a second `=`", () => {
  expect(itemStatRecord(odd)).toEqual({
    lvl: "6",
    opis: "a",
    created: "1",
    amount: "2",
    rarity: "heroic",
  });
});

test("a stat value keeps every `=` after the first and the last repeat wins", () => {
  expect(itemStatValue(odd, "opis")).toBe("a=b");
  expect(itemStatValue(odd, "lvl")).toBe("6");
  expect(itemStatValue(odd, "bound")).toBeUndefined();
  expect(itemStatValue("rarity=heroic;rarity", "rarity")).toBeUndefined();
});

test("a flag counts as present, a key that only prefixes another does not", () => {
  expect(hasItemStat("permbound;lvl=5", "permbound")).toBe(true);
  expect(hasItemStat("cursed=1", "cursed")).toBe(true);
  expect(hasItemStat("permbounded", "permbound")).toBe(false);
});

test("removing a key keeps the other entries as written", () => {
  expect(withoutItemStat("lvl=5;etiquette=a|b;;opis=x=y", "etiquette")).toBe(
    "lvl=5;;opis=x=y",
  );
});
