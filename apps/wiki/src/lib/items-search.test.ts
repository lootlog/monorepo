import { describe, expect, it } from "vitest";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";
import {
  effectiveScope,
  toCatalogParams,
  validateItemsSearch,
} from "./items-search";

describe("items search scope", () => {
  it("defaults to equipment when browsing without a query and expands to all when searching by phrase", () => {
    expect(effectiveScope(EMPTY_ITEMS_SEARCH)).toBe("equipment");
    expect(toCatalogParams(EMPTY_ITEMS_SEARCH).categories).toEqual([
      "equipment",
    ]);

    const phrased = { ...EMPTY_ITEMS_SEARCH, query: "zezwolenie" };
    expect(effectiveScope(phrased)).toBe("all");
    expect(toCatalogParams(phrased).categories).toBeUndefined();
  });

  it("keeps explicit scope choices even when a phrase is typed", () => {
    const equipmentWithQuery = {
      ...EMPTY_ITEMS_SEARCH,
      query: "papucie",
      scope: "equipment",
    };

    expect(effectiveScope(equipmentWithQuery)).toBe("equipment");
    expect(toCatalogParams(equipmentWithQuery).categories).toEqual([
      "equipment",
    ]);

    const craftingOnly = { ...EMPTY_ITEMS_SEARCH, scope: "crafting" };
    expect(toCatalogParams(craftingOnly).categories).toEqual(["crafting"]);

    const otherItems = { ...EMPTY_ITEMS_SEARCH, scope: "other" };
    expect(toCatalogParams(otherItems).categories).toEqual([
      "crafting",
      "other",
    ]);
  });

  it("treats legacy links with non-equippable types as other while keeping equippable type filters in equipment", () => {
    expect(effectiveScope({ ...EMPTY_ITEMS_SEARCH, types: "BAG,KEYS" })).toBe(
      "other",
    );

    expect(
      effectiveScope({ ...EMPTY_ITEMS_SEARCH, types: "SHIELD,HELP_WEAPON" }),
    ).toBe("equipment");
  });

  it("drops invalid scope values from URL params", () => {
    expect(validateItemsSearch({ scope: "bogus" }).scope).toBe("");
    expect(validateItemsSearch({ scope: "crafting" }).scope).toBe("crafting");
  });
});
