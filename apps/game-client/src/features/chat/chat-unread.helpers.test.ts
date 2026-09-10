import { describe, expect, it } from "vitest";
import { formatChatUnreadBadge } from "./chat-unread.helpers";

describe("chat-unread.helpers", () => {
  it("formats unread badge with 9+ clamp", () => {
    expect(formatChatUnreadBadge()).toBeNull();
    expect(formatChatUnreadBadge(0)).toBeNull();
    expect(formatChatUnreadBadge(4)).toBe("4");
    expect(formatChatUnreadBadge(9)).toBe("9");
    expect(formatChatUnreadBadge(10)).toBe("9+");
  });
});
