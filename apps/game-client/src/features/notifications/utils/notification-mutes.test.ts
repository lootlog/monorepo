import {
  appendMutedNpc,
  appendMutedPlayer,
  createMutedNpcPreference,
  getNotificationNpcMuteKey,
  isNotificationMuted,
} from "@/features/notifications/utils/notification-mutes";
import type { NotificationMutes } from "@lootlog/schema/user-preferences";

describe("notification mutes", () => {
  const baseMutes: NotificationMutes = {
    players: [],
    npcs: [],
  };

  it("matches player mutes by discord id", () => {
    expect(
      isNotificationMuted(
        {
          notificationId: "notification-1",
          discordId: "discord-1",
          guildId: "guild-1",
          world: "Aequus",
          createdAt: "2026-04-15T10:00:00.000Z",
          message: "test",
        },
        {
          ...baseMutes,
          players: [
            {
              discordId: "discord-1",
              displayName: "Kamil",
            },
          ],
        },
      ),
    ).toBe(true);
  });

  it("builds a stable npc key for colossus notifications", () => {
    const firstKey = getNotificationNpcMuteKey({
      notificationId: "notification-1",
      discordId: "discord-1",
      guildId: "guild-1",
      world: "Aequus",
      createdAt: "2026-04-15T10:00:00.000Z",
      npc: {
        id: 999999,
        name: "Tezaur",
        nick: "Tezaur",
        lvl: 300,
        prof: "m",
        icon: "tezaur.png",
        tpl: 1,
        wt: 95,
        type: 10,
        x: 1,
        y: 1,
        location: "Kwieciste Przejście",
      },
    });

    const secondKey = getNotificationNpcMuteKey({
      notificationId: "notification-2",
      discordId: "discord-2",
      guildId: "guild-1",
      world: "Aequus",
      createdAt: "2026-04-15T10:01:00.000Z",
      npc: {
        id: 111111,
        name: "Tezaur",
        nick: "Tezaur",
        lvl: 300,
        prof: "m",
        icon: "tezaur.png",
        tpl: 1,
        wt: 95,
        type: 10,
        x: 1,
        y: 1,
        location: "Kwieciste Przejście",
      },
    });

    expect(firstKey).toBe(secondKey);
  });

  it("keeps a Hero Tracker muted after it moves to a hiding place with another id", () => {
    const trackerNotification = (id: number, location: string) => ({
      notificationId: `notification-${id}`,
      discordId: "discord-1",
      guildId: "guild-1",
      world: "Aequus",
      createdAt: "2026-11-06T17:00:00.000Z",
      npc: {
        id,
        name: "Doświadczony Tropiciel Herosów",
        nick: "Doświadczony Tropiciel Herosów",
        lvl: 282,
        prof: "",
        icon: "npc/tropiciel.gif",
        tpl: 190436,
        wt: 0,
        type: 0,
        x: 1,
        y: 1,
        location,
      },
    });

    expect(
      getNotificationNpcMuteKey(
        trackerNotification(190436, "Jaskinia Piaskowej Burzy s.1"),
      ),
    ).toBe(
      getNotificationNpcMuteKey(trackerNotification(190999, "Grobowiec Seta")),
    );
  });

  it("replaces duplicated mute entries with the latest payload", () => {
    const mutedNpc = createMutedNpcPreference({
      notificationId: "notification-1",
      discordId: "discord-1",
      guildId: "guild-1",
      world: "Aequus",
      createdAt: "2026-04-15T10:00:00.000Z",
      npc: {
        id: 123,
        name: "Mushita",
        nick: "Mushita",
        lvl: 23,
        prof: "m",
        icon: "mushita.png",
        tpl: 1,
        wt: 80,
        type: 10,
        x: 1,
        y: 1,
        location: "Las Tropicieli",
      },
    });

    if (!mutedNpc) {
      throw new Error("Expected npc mute preference");
    }

    const mutesAfterPlayer = appendMutedPlayer(baseMutes, {
      discordId: "discord-1",
      displayName: "Kamil",
    });

    const mutesAfterNpc = appendMutedNpc(
      {
        players: mutesAfterPlayer,
        npcs: [],
      },
      mutedNpc,
    );

    const nextPlayers = appendMutedPlayer(
      {
        players: mutesAfterPlayer,
        npcs: mutesAfterNpc,
      },
      {
        discordId: "discord-1",
        displayName: "Kamil 2",
      },
    );

    expect(nextPlayers).toEqual([
      {
        discordId: "discord-1",
        displayName: "Kamil 2",
      },
    ]);
    expect(mutesAfterNpc).toEqual([mutedNpc]);
  });
});
