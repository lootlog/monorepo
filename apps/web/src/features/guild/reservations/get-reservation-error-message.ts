import { getApiErrorMessage, isApiError } from "@lootlog/client/transport";
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

export const getReservationErrorMessage = (
  error: unknown,
  t: TFunction,
): string => {
  const data = isApiError(error) ? error.data : undefined;
  const body = typeof data === "object" && data !== null ? data : undefined;
  const code =
    body && "code" in body && typeof body.code === "string"
      ? body.code
      : getApiErrorMessage(error);
  if (code && RESERVATION_ERROR_CODES.has(code)) {
    const detailFields: Record<string, string> = {
      ACTIVE_LIMIT_REACHED: "limit",
      RESERVATION_TOO_SHORT: "minimumMinutes",
      RESERVATION_TOO_LONG: "maximumMinutes",
      RESERVATION_TOO_FAR_IN_ADVANCE: "maximumDays",
      INVALID_TIME_GRID: "granularityMinutes",
    };
    const field = detailFields[code];
    const value = body && field ? Reflect.get(body, field) : undefined;
    if (typeof value === "number" && Number.isFinite(value)) {
      return t(`reservations.errors.${code}`, { context: "detailed", value });
    }
    return t(`reservations.errors.${code}`);
  }
  return t("reservations.errors.unknown");
};
