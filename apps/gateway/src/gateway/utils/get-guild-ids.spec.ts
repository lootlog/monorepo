import { getGuildIds } from "./get-guild-ids";

describe("getGuildIds", () => {
  it("should extract guild IDs from guilds array", () => {
    const guilds = [
      { guild: { id: "guild-1", ownerId: "owner-1" }, roles: [] },
      { guild: { id: "guild-2", ownerId: "owner-2" }, roles: [] },
      { guild: { id: "guild-3", ownerId: "owner-3" }, roles: [] },
    ];

    const result = getGuildIds(guilds);

    expect(result).toEqual(["guild-1", "guild-2", "guild-3"]);
  });

  it("should return empty array for empty guilds input", () => {
    const result = getGuildIds([]);

    expect(result).toEqual([]);
  });

  it("should handle single guild", () => {
    const guilds = [
      { guild: { id: "guild-only", ownerId: "owner-only" }, roles: [] },
    ];

    const result = getGuildIds(guilds);

    expect(result).toEqual(["guild-only"]);
  });

  it("should preserve order of guild IDs", () => {
    const guilds = [
      { guild: { id: "guild-first", ownerId: "owner-1" }, roles: [] },
      { guild: { id: "guild-second", ownerId: "owner-2" }, roles: [] },
      { guild: { id: "guild-third", ownerId: "owner-3" }, roles: [] },
    ];

    const result = getGuildIds(guilds);

    expect(result[0]).toBe("guild-first");
    expect(result[1]).toBe("guild-second");
    expect(result[2]).toBe("guild-third");
  });

  it("should work with guilds having different properties", () => {
    const guilds = [
      {
        guild: { id: "guild-1", ownerId: "owner-1", name: "Guild One" },
        roles: [
          {
            id: "role-1",
            lvlRangeFrom: 1,
            lvlRangeTo: 100,
            permissions: [],
          },
        ],
      },
      {
        guild: { id: "guild-2", ownerId: "owner-2", name: "Guild Two" },
        roles: [
          {
            id: "role-2",
            lvlRangeFrom: 50,
            lvlRangeTo: 200,
            permissions: [],
          },
        ],
      },
    ];

    const result = getGuildIds(guilds);

    expect(result).toEqual(["guild-1", "guild-2"]);
  });

  it("should handle numeric guild IDs", () => {
    const guilds = [
      { guild: { id: "123", ownerId: "owner-123" }, roles: [] },
      { guild: { id: "456", ownerId: "owner-456" }, roles: [] },
    ];

    const result = getGuildIds(guilds);

    expect(result).toEqual(["123", "456"]);
  });
});
