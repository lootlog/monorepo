import { Capability } from "@lootlog/access-policy";
import { Permission } from "@lootlog/types";
import type { GuildRole } from "#src/guilds/types/guild.types";
import { createGuildAccessPolicy } from "./access-policy.adapter.js";

const createRole = (permissions: GuildRole["permissions"]): GuildRole => ({
  id: "role-1",
  lvlRangeFrom: 0,
  lvlRangeTo: 999,
  permissions,
});

describe("createGuildAccessPolicy", () => {
  it("combines grants from every role", () => {
    const policy = createGuildAccessPolicy([
      createRole([Permission.LOOTLOG_CHAT_READ]),
      createRole([Permission.LOOTLOG_TIMERS_READ]),
    ]);

    expect(policy.allows(Capability.LOOTLOG_CHAT_READ)).toBe(true);
    expect(policy.allows(Capability.LOOTLOG_TIMERS_READ)).toBe(true);
  });

  it("applies administrative capability expansion", () => {
    const policy = createGuildAccessPolicy([createRole([Permission.ADMIN])]);

    expect(policy.allows(Capability.LOOTLOG_CHAT_READ)).toBe(true);
    expect(policy.allows(Capability.OWNER)).toBe(false);
  });

  it("denies capabilities when the member has no roles", () => {
    expect(
      createGuildAccessPolicy([]).allows(Capability.LOOTLOG_CHAT_READ),
    ).toBe(false);
  });
});
