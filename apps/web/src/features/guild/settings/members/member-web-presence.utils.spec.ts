import { describe, expect, it } from "vitest";
import {
  applyMemberWebPresenceUpdate,
  getMemberWebSessionCount,
  isMemberOnlineOnWeb,
  mapMemberWebPresenceByDiscordId,
} from "./member-web-presence.utils";

describe("member web presence utils", () => {
  it("maps web sessions by Discord ID and skips empty entries", () => {
    const mapped = mapMemberWebPresenceByDiscordId({
      "discord-1": [{ sessionId: "session-1" }, { sessionId: "session-2" }],
      "discord-2": [],
    });

    expect(mapped.get("discord-1")).toEqual(
      new Set(["session-1", "session-2"]),
    );
    expect(mapped.has("discord-2")).toBe(false);
  });

  it("adds and removes web presence sessions from live updates", () => {
    const added = applyMemberWebPresenceUpdate(undefined, {
      guildId: "guild-1",
      discordId: "discord-1",
      sessionId: "session-1",
      status: "online",
    });
    const updated = applyMemberWebPresenceUpdate(added, {
      guildId: "guild-1",
      discordId: "discord-1",
      sessionId: "session-1",
      status: "offline",
    });

    expect(isMemberOnlineOnWeb(added, "discord-1")).toBe(true);
    expect(isMemberOnlineOnWeb(updated, "discord-1")).toBe(false);
  });

  it("counts active web sessions from live presence", () => {
    const mapped = mapMemberWebPresenceByDiscordId({
      "discord-1": [{ sessionId: "session-1" }, { sessionId: "session-2" }],
    });

    expect(getMemberWebSessionCount(mapped, "discord-1")).toBe(2);
    expect(getMemberWebSessionCount(mapped, "discord-2")).toBe(0);
  });
});
