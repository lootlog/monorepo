import { expect, test } from "bun:test";
import {
  getDiscordAvatarUrl,
  getDiscordServerAvatarUrl,
} from "./discord-avatar.js";

test("serves a member's per-server avatar from the guild, not from the user's own avatars", () => {
  const stored = getDiscordServerAvatarUrl("guild-1", "42", "a_hash");

  expect(getDiscordAvatarUrl("42", stored, 64)).toBe(
    "https://cdn.discordapp.com/guilds/guild-1/users/42/avatars/a_hash.gif?size=64",
  );
  expect(getDiscordAvatarUrl("42", "hash", 64)).toBe(
    "https://cdn.discordapp.com/avatars/42/hash?size=64",
  );
});
