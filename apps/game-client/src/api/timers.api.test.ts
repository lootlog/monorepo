import { describe, expect, it } from "vitest";
import { normalizeTimerResponse } from "./timers.api";

describe("timers.api", () => {
  it("preserves actor character data when normalizing timer responses", () => {
    const timer = normalizeTimerResponse({
      guildId: "guild-1",
      npcId: 123,
      timerKey: "123:test boss",
      world: "test-world",
      minSpawnTime: "2026-05-03T08:00:00.000Z",
      maxSpawnTime: "2026-05-03T09:00:00.000Z",
      wasReset: false,
      updatedAt: "2026-05-03T07:30:00.000Z",
      npc: {
        id: 123,
        name: "Test Boss",
        prof: "w",
        location: "Test Location",
        wt: "25",
        lvl: 100,
        type: "HERO",
        icon: "icon.png",
        margonemType: "4",
      },
      member: {
        id: 1,
        userId: "discord123",
        guildId: "guild-1",
        type: "OWNER",
        name: "Tester",
        avatar: null,
        banner: null,
        active: true,
        roles: [],
        globalUserId: "global-1",
        lastDiscordSyncAt: null,
        updatedAt: "2026-05-03T07:00:00.000Z",
      },
      actorCharacter: {
        accountId: 200,
        characterId: 100,
        name: "Hero One",
        prof: "BLADE_DANCER",
        icon: "hero.gif",
        lvl: 300,
      },
    });

    expect(timer.actorCharacter).toMatchObject({
      accountId: 200,
      characterId: 100,
      name: "Hero One",
      prof: "BLADE_DANCER",
      icon: "hero.gif",
      lvl: 300,
    });
    expect(timer.actorCharactersByMemberId).toEqual({
      "1": timer.actorCharacter,
    });
  });
});
