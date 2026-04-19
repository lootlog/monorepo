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

  it("coerces string numeric fields from charlist payloads", () => {
    expect(
      normalizeCharacterList([
        {
          id: "1",
          icon: "/icon.gif",
          lvl: "300",
          nick: "Hero",
          prof: "w",
          world: "fobos",
          clan: "12",
          clan_rank: "3",
          last: "123456",
        },
      ]),
    ).toEqual([
      {
        id: 1,
        icon: "/icon.gif",
        lvl: 300,
        nick: "Hero",
        prof: "w",
        world: "fobos",
        clan: 12,
        clan_rank: 3,
        last: 123456,
      },
    ]);
  });

  it("normalizes tuple-based character payloads", () => {
    expect(
      normalizeCharacterList([
        [1, "Hero", "fobos", "300", "w", "m", "/icon.gif", "123456", "7", "2"],
      ]),
    ).toEqual([
      {
        id: 1,
        nick: "Hero",
        world: "fobos",
        lvl: 300,
        prof: "w",
        gender: "m",
        icon: "/icon.gif",
        last: 123456,
        clan: 7,
        clan_rank: 2,
      },
    ]);
  });

  it("normalizes nested payloads with alias field names", () => {
    expect(
      normalizeCharacterList([
        {
          character: {
            characterId: "1",
            nickname: "Hero",
            serverName: "fobos",
            level: "300",
            profession: "w",
            imageUrl: "/icon.gif",
          },
        },
      ]),
    ).toEqual([
      {
        id: 1,
        nick: "Hero",
        world: "fobos",
        lvl: 300,
        prof: "w",
        icon: "/icon.gif",
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
