import { describe, expect, it, vi } from "vitest";
import type { ChatMessage as ChatMessageType } from "@/hooks/api/use-chat-messages";
import { MessageType } from "@/hooks/api/use-send-chat-message";
import {
  getChatMessageBody,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";

vi.mock("@/features/npc-detector/components/npc-list-item", () => ({
  NPCS_WITH_LOCATION: ["hero"],
}));

vi.mock("@/hooks/api/use-npcs", () => ({
  NpcType: {
    HERO: "hero",
  },
}));

vi.mock("@lootlog/types", () => ({
  getNpcTypeByWt: () => "hero",
}));

vi.mock("@/constants/margonem", () => ({
  NPC_NAMES: {
    hero: {
      shortname: "H",
    },
  },
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

  it("builds the NPC body text with location coordinates", () => {
    expect(
      getChatMessageBody(
        makeChatMessage({
          type: MessageType.NPC,
          npc: {
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
          },
        }),
      ),
    ).toEqual({
      color: expect.any(String),
      text: "[H] Hydra (250m) - Swamp (7, 9)",
    });
  });
});
