import {
  getApiErrorNumberDetail,
  getApiErrorStringField,
} from "@lootlog/client/transport";
import type { TFunction } from "i18next";

const RESERVATION_ERROR_CODES = new Set([
  "FORBIDDEN",
  "GUILD_NOT_FOUND",
  "AUTHENTICATION_REQUIRED",
  "RESERVATION_WINDOW_TOO_LARGE",
  "INVALID_TIME_RANGE",
  "RESERVATION_START_IN_PAST",
  "RESERVATION_TOO_SHORT",
  "RESERVATION_TOO_LONG",
  "RESERVATION_TOO_FAR_IN_ADVANCE",
  "RESERVATION_MEMBER_REQUIRED",
  "RESERVATION_NOT_FOUND",
  "RESERVATION_SPOT_NOT_FOUND",
  "RESERVATION_DELETE_FORBIDDEN",
  "INVITATION_NOT_FOUND",
  "INVITATION_ALREADY_USED",
  "RESERVATION_SHARE_NOT_FOUND",
  "TARGET_ORGANIZATION_NOT_FOUND",
  "RESERVATION_OVERLAP",
  "ACTIVE_LIMIT_REACHED",
  "INVALID_TIME_GRID",
  "DM_TARGET_REQUIRED",
  "REMINDER_TIME_ELAPSED",
  "INVITATION_EXPIRED",
  "RESERVATION_SHARE_EXISTS",
  "RESERVATION_SHARE_WITH_SELF",
]);

/** The `details` value that completes each code's message. */
const DETAIL_KEYS = new Map([
  ["ACTIVE_LIMIT_REACHED", "limit"],
  ["RESERVATION_TOO_SHORT", "minimumMinutes"],
  ["RESERVATION_TOO_LONG", "maximumMinutes"],
  ["RESERVATION_TOO_FAR_IN_ADVANCE", "maximumDays"],
  ["INVALID_TIME_GRID", "granularityMinutes"],
]);

export const getReservationErrorMessage = (
  cause: unknown,
  t: TFunction,
): string => {
  const code = getApiErrorStringField(cause, "code");

  if (code && RESERVATION_ERROR_CODES.has(code)) {
    const detailKey = DETAIL_KEYS.get(code);

    const value = detailKey
      ? getApiErrorNumberDetail(cause, detailKey)
      : undefined;

    if (value !== undefined) {
      return t(`reservations.errors.${code}`, { context: "detailed", value });
    }

    return t(`reservations.errors.${code}`);
  }

  return t("reservations.errors.unknown");
};
