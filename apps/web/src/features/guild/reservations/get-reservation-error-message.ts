import { getApiErrorMessage, isApiError } from "@lootlog/client/transport";
import { z } from "zod";
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

const reservationErrorBody = z.object({
  code: z.string().optional().catch(undefined),
  limit: z.number().optional().catch(undefined),
  minimumMinutes: z.number().optional().catch(undefined),
  maximumMinutes: z.number().optional().catch(undefined),
  maximumDays: z.number().optional().catch(undefined),
  granularityMinutes: z.number().optional().catch(undefined),
});

export const getReservationErrorMessage = (
  cause: unknown,
  t: TFunction,
): string => {
  const result = reservationErrorBody.safeParse(
    isApiError(cause) ? cause.data : undefined,
  );

  const body = result.success ? result.data : undefined;
  const code = body?.code ?? getApiErrorMessage(cause);

  if (code && RESERVATION_ERROR_CODES.has(code)) {
    const details = new Map([
      ["ACTIVE_LIMIT_REACHED", body?.limit],
      ["RESERVATION_TOO_SHORT", body?.minimumMinutes],
      ["RESERVATION_TOO_LONG", body?.maximumMinutes],
      ["RESERVATION_TOO_FAR_IN_ADVANCE", body?.maximumDays],
      ["INVALID_TIME_GRID", body?.granularityMinutes],
    ]);

    const value = details.get(code);

    if (value !== undefined) {
      return t(`reservations.errors.${code}`, { context: "detailed", value });
    }

    return t(`reservations.errors.${code}`);
  }

  return t("reservations.errors.unknown");
};
