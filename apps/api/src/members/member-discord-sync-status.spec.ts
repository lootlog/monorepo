import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  getTransientMemberSyncStatus,
  isRetryableMemberRefreshStatus,
  isTransientMemberSyncStatus,
  MEMBER_DISCORD_SYNC_STATUS,
} from "./member-discord-sync-status.js";

describe("member-discord-sync-status", () => {
  it("should treat dynamic Discord HTTP statuses as retryable refresh failures", () => {
    expect(isRetryableMemberRefreshStatus("DISCORD_HTTP_408")).toBe(true);
    expect(isTransientMemberSyncStatus("DISCORD_HTTP_408")).toBe(true);
  });

  it("should not retry definitive member states", () => {
    expect(
      isRetryableMemberRefreshStatus(MEMBER_DISCORD_SYNC_STATUS.SUCCESS),
    ).toBe(false);
    expect(
      isRetryableMemberRefreshStatus(MEMBER_DISCORD_SYNC_STATUS.NOT_FOUND),
    ).toBe(false);
    expect(
      isRetryableMemberRefreshStatus(MEMBER_DISCORD_SYNC_STATUS.UNAUTHORIZED),
    ).toBe(false);
  });

  it("should treat queued and rate limited refreshes as transient access states", () => {
    expect(isTransientMemberSyncStatus(MEMBER_DISCORD_SYNC_STATUS.QUEUED)).toBe(
      true,
    );
    expect(
      isTransientMemberSyncStatus(MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED),
    ).toBe(true);
  });

  it("should map auth service outages separately from Discord outages", () => {
    expect(
      getTransientMemberSyncStatus(
        new ServiceUnavailableException({
          message: MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE,
        }),
      ),
    ).toBe(MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE);

    expect(
      getTransientMemberSyncStatus(
        new ServiceUnavailableException(
          MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE,
        ),
      ),
    ).toBe(MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE);

    expect(
      getTransientMemberSyncStatus(new ServiceUnavailableException()),
    ).toBe(MEMBER_DISCORD_SYNC_STATUS.DISCORD_SERVICE_UNAVAILABLE);
  });

  it("should preserve unexpected HTTP status codes for diagnostics and retries", () => {
    expect(
      getTransientMemberSyncStatus(
        new HttpException("timeout", HttpStatus.REQUEST_TIMEOUT),
      ),
    ).toBe("DISCORD_HTTP_408");
  });
});
