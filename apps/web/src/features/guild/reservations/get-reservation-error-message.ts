import type { TFunction } from "i18next";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";

const RESERVATION_ERROR_CODES = new Set([
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
  const code = getApiErrorMessage(error);
  if (code && RESERVATION_ERROR_CODES.has(code)) {
    return t(`reservations.errors.${code}`);
  }
  return t("reservations.errors.unknown");
};
