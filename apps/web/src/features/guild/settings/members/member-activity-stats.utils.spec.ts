import { describe, expect, it } from "vitest";
import {
  mapMemberActivityStatsByDiscordIdAndSource,
  mapMemberActivityStatsByDiscordId,
} from "./member-activity-stats.utils";
import type { MemberActivityStats } from "./member-activity-stats-api";

const buildStats = (
  overrides: Partial<MemberActivityStats>,
): MemberActivityStats => ({
  guildId: "guild-1",
  discordId: "discord-1",
  source: "WEB_APP",
  lastSeenAt: "2026-01-01T00:00:00.000Z",
  visitCount: 1,
  activeSessionCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("member activity stats utils", () => {
  it("maps stats by Discord ID", () => {
    const mapped = mapMemberActivityStatsByDiscordId([
      buildStats({ discordId: "discord-1" }),
      buildStats({ discordId: "discord-2", visitCount: 5 }),
    ]);

    expect(mapped.get("discord-1")?.visitCount).toBe(1);
    expect(mapped.get("discord-2")?.visitCount).toBe(5);
  });

  it("maps web and game stats by Discord ID without overwriting sources", () => {
    const mapped = mapMemberActivityStatsByDiscordIdAndSource([
      buildStats({
        discordId: "discord-1",
        source: "WEB_APP",
        visitCount: 2,
      }),
      buildStats({
        discordId: "discord-1",
        source: "GAME",
        visitCount: 7,
      }),
    ]);

    expect(mapped.get("discord-1")?.WEB_APP?.visitCount).toBe(2);
    expect(mapped.get("discord-1")?.GAME?.visitCount).toBe(7);
  });
});
