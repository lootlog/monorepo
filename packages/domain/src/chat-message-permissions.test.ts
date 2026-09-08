import { expect, test } from "bun:test";
import { Capability } from "./access-policy.js";
import {
  canDeleteChatMessage,
  canEditChatMessage,
} from "./chat-message-permissions.js";

test("chat editing stays author-only while deletion permits administrators", () => {
  const message = { senderId: "author" };
  for (const viewer of [
    { discordId: "author", permissions: [], edit: false, remove: false },
    {
      discordId: "author",
      permissions: [Capability.LOOTLOG_CHAT_WRITE],
      edit: true,
      remove: true,
    },
    { discordId: "other", permissions: [], edit: false, remove: false },
    {
      discordId: "admin",
      permissions: [Capability.ADMIN],
      edit: false,
      remove: true,
    },
    {
      discordId: "owner",
      permissions: [Capability.OWNER],
      edit: false,
      remove: true,
    },
  ]) {
    expect(canEditChatMessage(viewer, message)).toBe(viewer.edit);
    expect(canDeleteChatMessage(viewer, message)).toBe(viewer.remove);
  }
});
