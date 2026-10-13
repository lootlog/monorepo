// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGuildSearchRows } from "./use-guild-search-rows";

const loading: Parameters<typeof useGuildSearchRows>[0] = {
  trimmedSearch: "wild",
  pageResults: [],
  showSearchResults: false,
  npcValues: [],
  itemValues: [],
  playerValues: [],
  hidValue: null,
  canSearchDirectly: true,
};

const loaded = {
  ...loading,
  showSearchResults: true,
  npcValues: ["npc-Wild Piglet", "npc-Wildwife"],
  itemValues: ["item-Wild Snouts"],
};

describe("useGuildSearchRows", () => {
  it("moves the highlight to the first hit when results arrive, so Enter opens it", () => {
    const { result, rerender } = renderHook(
      (input) => useGuildSearchRows(input),
      { initialProps: loading },
    );

    expect(result.current.selectedValue).toBe("direct-search");

    rerender(loaded);

    expect(result.current.selectedValue).toBe("npc-Wild Piglet");
  });

  it("keeps the row the member moved to while the rows stay the same", () => {
    const { result, rerender } = renderHook(
      (input) => useGuildSearchRows(input),
      { initialProps: loaded },
    );

    act(() => result.current.selectValue("item-Wild Snouts"));
    rerender({ ...loaded });

    expect(result.current.selectedValue).toBe("item-Wild Snouts");

    act(() => result.current.setScope("npcs"));

    expect(result.current.selectedValue).toBe("npc-Wild Piglet");
  });
});
