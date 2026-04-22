import { describe, expect, it } from "vitest";
import {
  clearAllChatUnreadCounts,
  clearChatUnreadCount,
  formatChatUnreadBadge,
  incrementChatUnreadCount,
} from "./chat-unread.helpers";

describe("chat-unread.helpers", () => {
  it("increments unread count for a guild", () => {
    expect(
      incrementChatUnreadCount({
        unreadCountByGuildId: { "guild-1": 1 },
        guildId: "guild-1",
      }),
    ).toEqual({
      "guild-1": 2,
    });
  });

  it("clears unread count for a single guild", () => {
    expect(
      clearChatUnreadCount({
        unreadCountByGuildId: {
          "guild-1": 2,
          "guild-2": 4,
        },
        guildId: "guild-1",
      }),
    ).toEqual({
      "guild-2": 4,
    });
  });

  it("clears all unread counts", () => {
    expect(clearAllChatUnreadCounts()).toEqual({});
  });

  it("formats unread badge with 9+ clamp", () => {
    expect(formatChatUnreadBadge()).toBeNull();
    expect(formatChatUnreadBadge(0)).toBeNull();
    expect(formatChatUnreadBadge(4)).toBe("4");
    expect(formatChatUnreadBadge(9)).toBe("9");
    expect(formatChatUnreadBadge(10)).toBe("9+");
  });
});
