import { describe, expect, it } from "vitest";
import { parseSearch, stringifySearch } from "./search-string";

describe("stringifySearch", () => {
  it("drops cleared filters instead of writing them into the URL", () => {
    const search = stringifySearch({
      tab: "legends",
      npcType: undefined,
      world: null,
      worlds: ["a", null, undefined, "b"],
    });

    expect(search).toBe("?tab=legends&worlds=a&worlds=b");
    expect(parseSearch(search)).toEqual({ tab: "legends", worlds: ["a", "b"] });
  });
});
