import { expect, test } from "bun:test";
import { Capability } from "./access-policy.js";
import { canDeleteChatMessage } from "./chat-message-permissions.js";

test("chat deletion permits authors with write capability and moderators", () => {
  const message = { senderId: "author" };

  for (const viewer of [
    { discordId: "author", permissions: [], remove: false },
    {
      discordId: "author",
      permissions: [Capability.LOOTLOG_CHAT_WRITE],
      remove: true,
    },
    { discordId: "other", permissions: [], remove: false },
    {
      discordId: "moderator",
      permissions: [Capability.LOOTLOG_MANAGE],
      remove: true,
    },
    {
      discordId: "admin",
      permissions: [Capability.ADMIN],
      remove: true,
    },
    {
      discordId: "owner",
      permissions: [Capability.OWNER],
      remove: true,
    },
  ]) {
    expect(canDeleteChatMessage(viewer, message)).toBe(viewer.remove);
  }
});
