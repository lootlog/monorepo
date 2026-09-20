import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("does not notify owner subscribers for movement or AFK changes, but publishes renames and ownership changes", () => {
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

    const store = useOnlineCharacterOwnersStore.getState();

    store.upsertPresence(presence);
    const listener = vi.fn();
    const unsubscribe = useOnlineCharacterOwnersStore.subscribe(listener);

    try {
      store.upsertPresence({
        ...presence,
        isAfk: true,
        mapName: "New map",
        player: {
          ...presence.player,
          location: { x: 10, y: 20, map: "New map" },
        },
      });
      expect(listener).not.toHaveBeenCalled();

      store.upsertPresence({
        ...presence,
        player: { ...presence.player, name: "Renamed" },
      });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getOwner("9822301", "617")?.playerName).toBe("Renamed");

      store.upsertPresence({ ...presence, discordId: "new-owner" });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(store.getOwner("9822301", "617")?.userId).toBe("new-owner");
    } finally {
      unsubscribe();
    }
  });

  it("ignores unrelated member updates while publishing changed and removed owner names", () => {
    const members = {
      "player-discord": {
        avatar: null,
        color: null,
        id: 1,
        name: "Guild Member",
        userId: "player-discord",
      },
    };

    const store = useOnlineCharacterOwnersStore.getState();

    store.upsertPresence(
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
      members,
    );
    const listener = vi.fn();
    const unsubscribe = useOnlineCharacterOwnersStore.subscribe(listener);

    try {
      store.setGuildMembers({
        "player-discord": {
          ...members["player-discord"],
          avatar: "new-avatar",
        },
        "unrelated-player": {
          ...members["player-discord"],
          userId: "unrelated-player",
          name: "Unrelated",
        },
      });
      expect(listener).not.toHaveBeenCalled();

      store.setGuildMembers({
        "player-discord": {
          ...members["player-discord"],
          name: "Renamed Member",
        },
      });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getOwner("9822301", "617")?.guildMemberName).toBe(
        "Renamed Member",
      );

      store.setGuildMembers({});
      expect(listener).toHaveBeenCalledTimes(2);
      expect(store.getOwner("9822301", "617")?.guildMemberName).toBeUndefined();
    } finally {
      unsubscribe();
    }
  });
});
