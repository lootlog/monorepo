import { describe, expect, it } from "vitest";
import { getMemberDiscordSyncPresentation } from "./member-discord-sync.utils";

describe("getMemberDiscordSyncPresentation", () => {
  it("treats successful sync as healthy and quiet in the list", () => {
    expect(
      getMemberDiscordSyncPresentation({
        active: true,
        lastDiscordStatus: "SUCCESS",
      }),
    ).toEqual({
      copyKey: "success",
      tone: "success",
      badgeKey: "confirmed",
      showListIndicator: false,
    });
  });

  it("shows queued refreshes as warnings", () => {
    expect(
      getMemberDiscordSyncPresentation({
        active: true,
        refreshQueued: true,
        lastDiscordStatus: "SUCCESS",
      }),
    ).toMatchObject({
      copyKey: "queued",
      tone: "warning",
      showListIndicator: true,
    });
  });

  it("maps Discord 404 member lookup to a blocking state", () => {
    expect(
      getMemberDiscordSyncPresentation({
        active: true,
        lastDiscordStatus: "NOT_FOUND",
      }),
    ).toMatchObject({
      copyKey: "notFound",
      tone: "danger",
      badgeKey: "blocked",
      showListIndicator: true,
    });
  });

  it("maps rate limits to a cached-data issue", () => {
    expect(
      getMemberDiscordSyncPresentation({
        active: true,
        lastDiscordStatus: "RATE_LIMITED",
      }),
    ).toMatchObject({
      copyKey: "rateLimited",
      tone: "warning",
      badgeKey: "issue",
      showListIndicator: true,
    });
  });

  it("maps dynamic Discord HTTP statuses to a generic Discord HTTP issue", () => {
    expect(
      getMemberDiscordSyncPresentation({
        active: true,
        lastDiscordStatus: "DISCORD_HTTP_500",
      }),
    ).toMatchObject({
      copyKey: "discordHttp",
      tone: "warning",
      badgeKey: "issue",
      showListIndicator: true,
    });
  });

  it("keeps missing sync history visible only in details", () => {
    expect(
      getMemberDiscordSyncPresentation({
        active: true,
        lastDiscordStatus: null,
      }),
    ).toEqual({
      copyKey: "noHistory",
      tone: "neutral",
      badgeKey: "unknown",
      showListIndicator: false,
    });
  });
});
