import { describe, expect, it } from "bun:test";
import { validateUsersSearch } from "./users-search.js";

describe("validateUsersSearch", () => {
  it('overrides what the filter form sends for "no filter" instead of leaving it in the address', () => {
    const search = validateUsersSearch({
      search: " kuchar ",
      role: "any",
      banned: "",
      page: "abc",
    });

    expect(search).toEqual({
      search: "kuchar",
      role: undefined,
      banned: undefined,
      page: undefined,
    });
    expect(Object.hasOwn(search, "role")).toBe(true);
    expect(Object.hasOwn(search, "banned")).toBe(true);
    expect(Object.hasOwn(search, "page")).toBe(true);
  });

  it("gives the same answer when the router validates its own result again", () => {
    const once = validateUsersSearch({ search: "kuchar", page: "3" });

    expect(validateUsersSearch(once)).toEqual(once);
    expect(once.page).toBe(3);
  });

  it("keeps real filters", () => {
    expect(
      validateUsersSearch({ role: "wiki-moderator", banned: "yes", page: "3" }),
    ).toMatchObject({ role: "wiki-moderator", banned: "yes", page: 3 });
  });
});
