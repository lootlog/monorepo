import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import {
  buildNpcChatMessagePayload,
  buildNpcNotificationPayload,
  resolveNpcNotificationRouting,
} from "./npc-notification";

const { mockGame } = vi.hoisted(() => ({
  mockGame: {
    hero: {
      id: 101,
      account: 202,
      nick: "Tester",
      lvl: 230,
      prof: "w",
      img: "hero.gif",
      clan: {
        id: "clan-1",
        name: "Lootlog",
      },
    },
    getWorldName: vi.fn(() => "pandora"),
  },
}));

vi.mock("@/lib/game", () => ({
  Game: mockGame,
}));

const npc: GameNpcWithLocation = {
  id: 500,
  nick: "Detected npc",
  x: 12,
  y: 18,
  icon: "event-icon.gif",
  lvl: 240,
  prof: "m",
  type: 3,
  wt: 80,
  tpl: 900,
  location: "Ithan",
  notificationSent: false,
};

describe("npc notification helpers", () => {
  beforeEach(() => {
    mockGame.getWorldName.mockReset();
    mockGame.getWorldName.mockReturnValue("pandora");
  });

  it("resolves guild ids using the current world", () => {
    const routing = resolveNpcNotificationRouting({
      routingRules: [
        {
          id: "rule-1",
          minLevel: 200,
          maxLevel: 260,
          world: "pandora",
          guildIds: ["guild-1", "guild-2"],
        },
        {
          id: "rule-2",
          minLevel: 200,
          maxLevel: 260,
          world: "fobos",
          guildIds: ["guild-3"],
        },
      ],
      npcLevel: 240,
    });

    expect(routing).toEqual({
      guildIds: ["guild-1", "guild-2"],
      world: "pandora",
    });
  });

  it("builds notification payloads with the resolved world", () => {
    expect(
      buildNpcNotificationPayload({
        npc,
        guildIds: ["guild-1"],
      }),
    ).toEqual({
      npc: {
        id: 500,
        hpp: 0,
        location: "Ithan",
        name: "Detected npc",
        wt: 80,
        x: 12,
        y: 18,
        lvl: 240,
        prof: "m",
        icon: "event-icon.gif",
        type: 3,
      },
      world: "pandora",
      guildIds: ["guild-1"],
    });
  });

  it("includes the current character in party gathering notifications", () => {
    expect(
      buildNpcNotificationPayload({
        npc,
        guildIds: ["guild-1"],
        isGatheringParty: true,
      }),
    ).toMatchObject({
      isGatheringParty: true,
      character: {
        accountId: "202",
        characterId: "101",
        icon: "hero.gif",
        lvl: 230,
        nick: "Tester",
        prof: "w",
      },
    });
  });

  it("builds chat payloads with current character data", () => {
    expect(
      buildNpcChatMessagePayload({
        npc,
        guildIds: ["guild-1"],
        messageType: MessageType.NPC,
      }),
    ).toEqual({
      message: "",
      guildIds: ["guild-1"],
      type: MessageType.NPC,
      characterData: {
        nick: "Tester",
        id: 101,
        acc: 202,
        lvl: 230,
        prof: "w",
        icon: "hero.gif",
      },
      npc: {
        x: 12,
        y: 18,
        icon: "event-icon.gif",
        id: 500,
        name: "Detected npc",
        lvl: 240,
        prof: "m",
        type: 3,
        hpp: 0,
        location: "Ithan",
        wt: 80,
      },
    });
  });
});
