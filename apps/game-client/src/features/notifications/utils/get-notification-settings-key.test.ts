import { describe, expect, it } from "vitest";
import { NpcType } from "@/api/npcs.api";
import {
  getNotificationSettingsKey,
  isNotificationSettingsKey,
} from "./get-notification-settings-key";

describe("getNotificationSettingsKey", () => {
  it("resolves party gathering notifications to their dedicated settings key", () => {
    expect(getNotificationSettingsKey({ type: "party-gathering" })).toBe(
      "party-gathering",
    );
  });

  it("uses message settings when an NPC category is unavailable", () => {
    expect(getNotificationSettingsKey({})).toBe("message");
    expect(getNotificationSettingsKey({ npc: { wt: 0 } })).toBe("message");
  });

  it("returns the NPC category when the notification has NPC weight", () => {
    expect(getNotificationSettingsKey({ npc: { wt: 20 } })).toBe(
      NpcType.ELITE2,
    );
    expect(getNotificationSettingsKey({ npc: { wt: 100 } })).toBe(
      NpcType.TITAN,
    );
  });
});

describe("isNotificationSettingsKey", () => {
  it("accepts configured notification settings keys", () => {
    expect(isNotificationSettingsKey("party-gathering")).toBe(true);
    expect(isNotificationSettingsKey(NpcType.TITAN)).toBe(true);
  });

  it("rejects NPC categories without notification settings", () => {
    expect(isNotificationSettingsKey(NpcType.COMMON)).toBe(false);
    expect(isNotificationSettingsKey(NpcType.ELITE3)).toBe(false);
  });
});
