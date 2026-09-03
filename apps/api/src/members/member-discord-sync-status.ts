import {
  ApplicationError,
  applicationErrorStatus,
  DependencyUnavailableError,
} from "#src/shared/http/http-errors";

export const MEMBER_DISCORD_SYNC_STATUS = {
  SUCCESS: "SUCCESS",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  QUEUED: "QUEUED",
  RATE_LIMITED: "RATE_LIMITED",
  AUTH_SERVICE_UNAVAILABLE: "AUTH_SERVICE_UNAVAILABLE",
  DISCORD_SERVICE_UNAVAILABLE: "DISCORD_SERVICE_UNAVAILABLE",
  ERROR: "ERROR",
} as const;

const DISCORD_HTTP_SYNC_STATUS_PREFIX = "DISCORD_HTTP_";

type MemberDiscordSyncStatusValue =
  (typeof MEMBER_DISCORD_SYNC_STATUS)[keyof typeof MEMBER_DISCORD_SYNC_STATUS];

type ExceptionResponseWithMessage = {
  message: string;
};

export type DiscordHttpSyncStatus =
  `${typeof DISCORD_HTTP_SYNC_STATUS_PREFIX}${number}`;

export type MemberSyncStatus =
  | Exclude<MemberDiscordSyncStatusValue, "QUEUED">
  | DiscordHttpSyncStatus;

export type MemberRefreshStatus =
  | MemberSyncStatus
  | typeof MEMBER_DISCORD_SYNC_STATUS.QUEUED;

export function toDiscordHttpSyncStatus(
  statusCode: number,
): DiscordHttpSyncStatus {
  return `${DISCORD_HTTP_SYNC_STATUS_PREFIX}${statusCode}`;
}

export function isTransientMemberSyncStatus(
  status: MemberRefreshStatus,
): boolean {
  return (
    status === MEMBER_DISCORD_SYNC_STATUS.QUEUED ||
    isRetryableMemberRefreshStatus(status)
  );
}

export function isRetryableMemberRefreshStatus(
  status: MemberRefreshStatus,
): boolean {
  return (
    status === MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED ||
    status === MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE ||
    status === MEMBER_DISCORD_SYNC_STATUS.DISCORD_SERVICE_UNAVAILABLE ||
    status === MEMBER_DISCORD_SYNC_STATUS.ERROR ||
    status.startsWith(DISCORD_HTTP_SYNC_STATUS_PREFIX)
  );
}

export function getTransientMemberSyncStatus(error: unknown): MemberSyncStatus {
  if (error instanceof DependencyUnavailableError) {
    if (
      getApplicationErrorMessage(error) ===
      MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE
    ) {
      return MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE;
    }

    return MEMBER_DISCORD_SYNC_STATUS.DISCORD_SERVICE_UNAVAILABLE;
  }

  if (error instanceof ApplicationError) {
    return toDiscordHttpSyncStatus(applicationErrorStatus(error));
  }

  return MEMBER_DISCORD_SYNC_STATUS.ERROR;
}

function getApplicationErrorMessage(error: ApplicationError): string | null {
  const response = error.getResponse();

  if (typeof response === "string") {
    return response;
  }

  if (!hasMessage(response)) {
    return null;
  }

  return response.message;
}

function hasMessage(
  response: unknown,
): response is ExceptionResponseWithMessage {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  return "message" in response && typeof response.message === "string";
}
