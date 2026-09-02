import { describe, expect, it, vi } from "vitest";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import { GuildListMemberRefreshService } from "./guild-list-member-refresh.service.js";

const makeFixture = () => {
  const logger = { log: vi.fn() };
  const repository = { findStaleMembers: vi.fn() };
  const members = {
    getMemberSoftStaleThreshold: vi.fn(
      () => new Date("2026-03-10T10:00:00.000Z"),
    ),
    queueMemberRefresh: vi.fn(),
  };
  const redis = { get: vi.fn(), set: vi.fn() };
  return {
    logger,
    repository,
    members,
    redis,
    service: new GuildListMemberRefreshService(
      logger,
      repository,
      members,
      redis,
    ),
  };
};

describe("GuildListMemberRefreshService", () => {
  it("does not query stale members while the user is throttled", async () => {
    const fixture = makeFixture();
    fixture.redis.get.mockResolvedValue("1");

    await fixture.service.queue("discord-a", "user-a", [{ id: "guild-a" }]);

    expect(fixture.repository.findStaleMembers).not.toHaveBeenCalled();
  });

  it("queues stale members and sets the established throttle", async () => {
    const fixture = makeFixture();
    fixture.redis.get.mockResolvedValue(null);
    fixture.repository.findStaleMembers.mockResolvedValue([
      {
        userId: "discord-a",
        guildId: "guild-a",
        globalUserId: "user-a",
      },
    ]);
    fixture.redis.set.mockResolvedValue(undefined);
    fixture.members.queueMemberRefresh.mockResolvedValue({ queued: true });

    await fixture.service.queue("discord-a", "user-a", [{ id: "guild-a" }]);

    expect(fixture.redis.set).toHaveBeenCalledWith(
      "member:sync:throttle:discord-a",
      "1",
      600,
    );
    expect(fixture.members.queueMemberRefresh).toHaveBeenCalledWith({
      discordId: "discord-a",
      guildId: "guild-a",
      userId: "user-a",
      priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
      reason: "guild-list-sync",
    });
  });
});
