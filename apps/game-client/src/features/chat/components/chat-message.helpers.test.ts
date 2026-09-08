import { describe, expect, it } from "vitest";
import { MessageType } from "@/api/chat.api";
import { createChatMessage } from "../chat-test-fixtures";
import {
  getChatNpcLocation,
  getChatNpcTextColor,
  getChatMessageBody,
  isChatMessageYesterdayOrOlder,
} from "./chat-message.helpers";

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
        createChatMessage({
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
