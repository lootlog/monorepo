import { describe, expect, it } from "vitest";
import { createTimerFixture } from "./timer-fixtures";
import { getMembersWithGuilds, getTimerMembers } from "./timer-members";

describe("timer-members", () => {
  it("prefers merged members over a single member and deduplicates guild labels", () => {
    const alice = {
      id: 1,
      userId: "user-1",
      guildId: "guild-1",
      type: "member",
      name: "Alice",
    };

    const bob = {
      ...alice,
      id: 2,
      userId: "user-2",
      guildId: "guild-2",
      name: "Bob",
    };

    const timer = createTimerFixture({
      member: alice,
      members: [alice, { ...alice }, bob],
    });

    expect(getTimerMembers(timer)).toHaveLength(3);
    expect(
      getMembersWithGuilds(
        getTimerMembers(timer),
        { "guild-1": "Alpha", "guild-2": "Beta" },
        {
          "2": {
            name: "Bobek",
            lvl: 70,
            prof: "PALADIN",
            icon: "icon.gif",
            characterId: 2,
            accountId: 2,
          },
        },
      ),
    ).toEqual([
      { id: 1, memberLabel: "Alice (Alpha)", characterLabel: undefined },
      { id: 2, memberLabel: "Bob (Beta)", characterLabel: "Bobek (70p)" },
    ]);
  });

  it("falls back to the single member and to a bare name without a guild", () => {
    const timer = createTimerFixture({
      member: {
        id: 3,
        userId: "u",
        guildId: "guild-x",
        type: "member",
        name: "Solo",
      },
    });

    expect(getMembersWithGuilds(getTimerMembers(timer), {})).toEqual([
      { id: 3, memberLabel: "Solo", characterLabel: undefined },
    ]);
  });
});
