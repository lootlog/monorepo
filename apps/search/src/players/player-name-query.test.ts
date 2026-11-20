import { describe, expect, it } from "bun:test";
import { playerNameQuery } from "./player-name-query.js";

describe("playerNameQuery", () => {
  it("uses the search string as the Meilisearch term", () => {
    expect(playerNameQuery({ limit: 10, search: "Hero" })).toEqual({
      searchTerm: "Hero",
      query: { limit: 10, attributesToSearchOn: ["name"] },
    });
  });

  it("uses an IN filter for multiple exact search values", () => {
    expect(playerNameQuery({ limit: 10, search: ["Hero", "Villain"] })).toEqual(
      {
        searchTerm: "",
        query: {
          limit: 10,
          attributesToSearchOn: ["name"],
          filter: 'name IN ["Hero", "Villain"]',
        },
      },
    );
  });

  it("uses an empty search term when search is omitted", () => {
    expect(playerNameQuery({ limit: 10 }).searchTerm).toBe("");
  });
});
