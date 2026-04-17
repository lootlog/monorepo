import { describe, expect, it } from "vitest";
import { normalizeCharacterList } from "@/api";
import { getCharacterListQueryKey } from "./use-character-list";

describe("use-character-list helpers", () => {
  it("uses a versioned query key for persisted character list data", () => {
    expect(getCharacterListQueryKey(123, "fobos")).toEqual([
      "characters-v2",
      123,
      "fobos",
    ]);
  });

  it("keeps valid character entries", () => {
    expect(
      normalizeCharacterList([
        {
          id: 1,
          icon: "icon",
          lvl: 300,
          nick: "Hero",
          prof: "w",
          world: "fobos",
        },
      ]),
    ).toEqual([
      {
        id: 1,
        icon: "icon",
        lvl: 300,
        nick: "Hero",
        prof: "w",
        world: "fobos",
      },
    ]);
  });

  it("drops legacy cached response objects instead of throwing in consumers", () => {
    expect(
      normalizeCharacterList({
        data: [
          {
            id: 1,
            icon: "icon",
            lvl: 300,
            nick: "Hero",
            prof: "w",
            world: "fobos",
          },
        ],
      }),
    ).toEqual([]);
  });
});
