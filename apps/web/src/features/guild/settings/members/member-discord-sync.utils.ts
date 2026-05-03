export type MemberDiscordSyncTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export type MemberDiscordSyncCopyKey =
  | "success"
  | "queued"
  | "cached"
  | "notFound"
  | "unauthorized"
  | "rateLimited"
  | "authServiceUnavailable"
  | "discordServiceUnavailable"
  | "discordHttp"
  | "error"
  | "manuallyDeactivated"
  | "guildNotInDiscordList"
  | "guildDeactivated"
  | "accountDeleted"
  | "noHistory"
  | "unknownStatus";

export type MemberDiscordSyncSource = {
  active: boolean;
  isStale?: boolean;
  refreshQueued?: boolean;
  lastDiscordStatus?: string | null;
};

export type MemberDiscordSyncPresentation = {
  copyKey: MemberDiscordSyncCopyKey;
  tone: MemberDiscordSyncTone;
  badgeKey: "confirmed" | "queued" | "cached" | "blocked" | "issue" | "unknown";
  showListIndicator: boolean;
};

const blockingStatusCopyKeys: Partial<
  Record<string, MemberDiscordSyncCopyKey>
> = {
  NOT_FOUND: "notFound",
  UNAUTHORIZED: "unauthorized",
  MANUALLY_DEACTIVATED: "manuallyDeactivated",
  GUILD_NOT_IN_DISCORD_LIST: "guildNotInDiscordList",
  GUILD_DEACTIVATED: "guildDeactivated",
  ACCOUNT_DELETED: "accountDeleted",
};

const transientStatusCopyKeys: Partial<
  Record<string, MemberDiscordSyncCopyKey>
> = {
  RATE_LIMITED: "rateLimited",
  AUTH_SERVICE_UNAVAILABLE: "authServiceUnavailable",
  DISCORD_SERVICE_UNAVAILABLE: "discordServiceUnavailable",
  ERROR: "error",
};

const discordHttpStatusPattern = /^DISCORD_HTTP_\d+$/;

const normalizeDiscordStatus = (status: string | null | undefined) => {
  const normalizedStatus = status?.trim();
  return normalizedStatus ? normalizedStatus : null;
};

export const getMemberDiscordSyncPresentation = (
  member: MemberDiscordSyncSource,
): MemberDiscordSyncPresentation => {
  const status = normalizeDiscordStatus(member.lastDiscordStatus);

  if (member.refreshQueued) {
    return {
      copyKey: "queued",
      tone: "warning",
      badgeKey: "queued",
      showListIndicator: true,
    };
  }

  if (!status) {
    return {
      copyKey: "noHistory",
      tone: "neutral",
      badgeKey: "unknown",
      showListIndicator: false,
    };
  }

  if (status === "SUCCESS") {
    if (member.isStale) {
      return {
        copyKey: "cached",
        tone: "warning",
        badgeKey: "cached",
        showListIndicator: true,
      };
    }

    return {
      copyKey: "success",
      tone: "success",
      badgeKey: "confirmed",
      showListIndicator: false,
    };
  }

  const blockingCopyKey = blockingStatusCopyKeys[status];
  if (blockingCopyKey) {
    return {
      copyKey: blockingCopyKey,
      tone: blockingCopyKey === "manuallyDeactivated" ? "neutral" : "danger",
      badgeKey: "blocked",
      showListIndicator: true,
    };
  }

  const transientCopyKey = transientStatusCopyKeys[status];
  if (transientCopyKey) {
    return {
      copyKey: transientCopyKey,
      tone: "warning",
      badgeKey: "issue",
      showListIndicator: true,
    };
  }

  if (discordHttpStatusPattern.test(status)) {
    return {
      copyKey: "discordHttp",
      tone: "warning",
      badgeKey: "issue",
      showListIndicator: true,
    };
  }

  return {
    copyKey: "unknownStatus",
    tone: "warning",
    badgeKey: member.active ? "issue" : "unknown",
    showListIndicator: true,
  };
};
