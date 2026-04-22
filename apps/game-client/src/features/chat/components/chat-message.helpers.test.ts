import { describe, expect, it, vi } from "vitest";
import {
  type ChatMessage as ChatMessageType,
  MessageType,
} from "@/api/chat.api";
import {
  getChatNpcLocation,
  getChatNpcTextColor,
  getChatMessageBody,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";

vi.mock("@/features/npc-detector/components/npc-list-item", () => ({
  NPCS_WITH_LOCATION: ["hero"],
}));

vi.mock("@/api/npcs.api", () => ({
  NpcType: {
    HERO: "hero",
  },
}));

vi.mock("@lootlog/types", () => ({
  getNpcTypeByWt: () => "hero",
}));

const makeChatMessage = (
  overrides?: Partial<ChatMessageType>,
): ChatMessageType => ({
  id: "message-1",
  guildId: "guild-1",
  message: "hello",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: MessageType.NORMAL,
  characterData: {
    nick: "Hero",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "hero.png",
  },
  canEdit: false,
  canDelete: false,
  ...overrides,
});

describe("chat-message helpers", () => {
  it("detects whether the message is from yesterday or earlier", () => {
    expect(
      isChatMessageYesterdayOrOlder(
        "2026-01-01T10:00:00.000Z",
        new Date("2026-01-02T10:00:00.000Z"),
      ),
    ).toBe(true);

    expect(
      isChatMessageYesterdayOrOlder(
        "2026-01-02T08:00:00.000Z",
        new Date("2026-01-02T10:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("formats the NPC location with coordinates when available", () => {
    expect(
      getChatNpcLocation({
        id: 10,
        name: "Hydra",
        icon: "npc.png",
        x: 7,
        y: 9,
        hpp: 100,
        location: "Swamp",
        lvl: 250,
        prof: "m",
        type: 1,
        wt: 100,
      }),
    ).toBe("Swamp (7, 9)");
  });

  it("returns NPC highlight color based on its category", () => {
    expect(
      getChatNpcTextColor({
        id: 10,
        name: "Hydra",
        icon: "npc.png",
        x: 7,
        y: 9,
        hpp: 100,
        location: "Swamp",
        lvl: 250,
        prof: "m",
        type: 1,
        wt: 100,
      }),
    ).toEqual(expect.any(String));
  });

  it("builds the notification body text", () => {
    expect(
      getChatMessageBody(
        makeChatMessage({
          type: MessageType.NOTIFICATION,
          message: "Ping",
        }),
      ),
    ).toEqual({
      color: expect.any(String),
      text: "[P] Ping",
    });
  });
});
