import { beforeEach, describe, expect, it } from "vitest";
import { useOnlineCharacterOwnersStore } from "./online-character-owners.store";

describe("useOnlineCharacterOwnersStore", () => {
  beforeEach(() => {
    useOnlineCharacterOwnersStore.getState().clearOwners();
  });

  it("maps online presence by account and character with guild member name", () => {
    useOnlineCharacterOwnersStore.getState().setPresenceResponse(
      {
        "player-discord": [
          {
            discordId: "player-discord",
            isAfk: false,
            player: {
              accountId: "9822301",
              characterId: "617",
              icon: "other.gif",
              lvl: 300,
              name: "Other",
              prof: "w",
              world: "tempest",
            },
          },
        ],
      },
      {
        "player-discord": {
          avatar: null,
          color: null,
          id: 1,
          name: "Guild Member",
          userId: "player-discord",
        },
      },
    );

    expect(
      useOnlineCharacterOwnersStore.getState().getOwner("9822301", "617"),
    ).toEqual({
      accountId: "9822301",
      characterId: "617",
      guildMemberName: "Guild Member",
      playerName: "Other",
      userId: "player-discord",
    });
  });

  it("removes the owner when an offline presence arrives", () => {
    const presence = {
      discordId: "player-discord",
      isAfk: false,
      player: {
        accountId: "9822301",
        characterId: "617",
        icon: "other.gif",
        lvl: 300,
        name: "Other",
        prof: "w",
        world: "tempest",
      },
    };

    useOnlineCharacterOwnersStore.getState().upsertPresence(presence);
    useOnlineCharacterOwnersStore.getState().removePresence({
      ...presence,
      status: "offline",
    });

    expect(
      useOnlineCharacterOwnersStore.getState().getOwner("9822301", "617"),
    ).toBeUndefined();
  });

  it("removes the owner by Discord ID when offline presence has no character payload", () => {
    useOnlineCharacterOwnersStore.getState().upsertPresence({
      discordId: "player-discord",
      isAfk: false,
      player: {
        accountId: "9822301",
        characterId: "617",
        icon: "other.gif",
        lvl: 300,
        name: "Other",
        prof: "w",
        world: "tempest",
      },
    });

    useOnlineCharacterOwnersStore.getState().removePresence({
      discordId: "player-discord",
      isAfk: false,
      status: "offline",
    });

    expect(
      useOnlineCharacterOwnersStore.getState().getOwner("9822301", "617"),
    ).toBeUndefined();
  });
});
