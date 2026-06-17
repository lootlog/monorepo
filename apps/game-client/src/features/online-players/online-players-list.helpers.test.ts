import { describe, expect, it } from "vitest";
import {
  DEFAULT_ONLINE_PLAYERS_FILTERS,
  getFilteredAccountEntries,
  getFilteredMemberEntries,
  getPresenceCharacter,
} from "@/features/online-players/online-players-list.helpers";
import type { PlayerPresence } from "@/lib/online-players-presence";

const createPresence = ({
  discordId,
  name,
  lvl,
  characterId,
  prof = "w",
}: {
  discordId: string;
  name: string;
  lvl: number;
  characterId: string;
  prof?: string;
}): PlayerPresence => ({
  discordId,
  guildId: "guild-1",
  platform: "game",
  isAfk: false,
  player: {
    world: "pandora",
    name,
    lvl,
    icon: `${name}.gif`,
    characterId,
    accountId: characterId,
    prof,
  },
});

describe("online players list helpers", () => {
  it("preserves explicit empty presence fields when creating character data", () => {
    const character = getPresenceCharacter(
      createPresence({
        discordId: "discord-1",
        name: "",
        lvl: 0,
        characterId: "0",
        prof: "",
      }),
    );

    expect(character).toMatchObject({
      icon: ".gif",
      lvl: 0,
      nick: "",
      prof: "",
      world: "pandora",
    });
  });

  it("sorts account entries by level descending after filtering", () => {
    const entries = getFilteredAccountEntries(
      {
        "discord-1": [
          createPresence({
            discordId: "discord-1",
            name: "Low",
            lvl: 80,
            characterId: "80",
          }),
        ],
        "discord-2": [
          createPresence({
            discordId: "discord-2",
            name: "High",
            lvl: 300,
            characterId: "300",
          }),
          createPresence({
            discordId: "discord-2",
            name: "Mid",
            lvl: 150,
            characterId: "150",
          }),
        ],
      },
      undefined,
      "",
      DEFAULT_ONLINE_PLAYERS_FILTERS,
    );

    expect(entries.map((entry) => entry.presence.player?.name)).toEqual([
      "High",
      "Mid",
      "Low",
    ]);
  });

  it("sorts member rows by top visible character level and sorts presences inside rows", () => {
    const entries = getFilteredMemberEntries(
      {
        "discord-low": [
          createPresence({
            discordId: "discord-low",
            name: "Low",
            lvl: 80,
            characterId: "80",
          }),
        ],
        "discord-high": [
          createPresence({
            discordId: "discord-high",
            name: "Mid",
            lvl: 150,
            characterId: "150",
          }),
          createPresence({
            discordId: "discord-high",
            name: "High",
            lvl: 300,
            characterId: "300",
          }),
        ],
      },
      {
        "discord-high": {
          id: 1,
          userId: "discord-high",
          name: "High Member",
        },
        "discord-low": {
          id: 2,
          userId: "discord-low",
          name: "Low Member",
        },
      },
      "",
      DEFAULT_ONLINE_PLAYERS_FILTERS,
    );

    expect(entries.map(([discordId]) => discordId)).toEqual([
      "discord-high",
      "discord-low",
    ]);
    expect(entries[0]?.[1].map((presence) => presence.player?.name)).toEqual([
      "High",
      "Mid",
    ]);
  });
});
