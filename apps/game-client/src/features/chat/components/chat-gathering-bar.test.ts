import { describe, expect, it } from "vitest";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";
import { selectFeaturedGathering } from "./chat-gathering-bar";

const first: ActivePartyGatheringSummary = {
  notificationId: "first",
  organizerName: "Hero",
  applicantCount: 0,
  inPartyCount: 0,
  guildIds: ["org"],
  world: "Test",
  createdAt: "2026-09-09T00:00:00Z",
  expiresAt: "2026-09-09T00:30:00Z",
};

const newer = {
  ...first,
  notificationId: "newer",
  createdAt: "2026-09-09T00:01:00Z",
};

describe("featured gathering target", () => {
  it("keeps the hovered or focused target when a newer gathering arrives", () => {
    expect(selectFeaturedGathering([newer, first], first)?.notificationId).toBe(
      "first",
    );
    expect(selectFeaturedGathering([newer, first], null)?.notificationId).toBe(
      "newer",
    );
  });
  it("does not substitute another target when the frozen gathering expires or loses access", () => {
    expect(selectFeaturedGathering([newer], first)).toBeNull();
    expect(selectFeaturedGathering([], first)).toBeNull();
  });
});
