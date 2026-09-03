import {
  InvalidRequestError,
  InvalidEntityError,
} from "#src/shared/http/http-errors";
import {
  validateReservationTime as getReservationTimeValidationIssue,
  type ReservationSettings,
} from "@lootlog/domain/reservations";

const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
export function parseReservationWindow(fromValue: string, toValue: string) {
  const from = new Date(fromValue);
  const to = new Date(toValue);
  const durationMs = to.getTime() - from.getTime();

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    durationMs <= 0
  ) {
    throw new InvalidRequestError({ code: "INVALID_TIME_RANGE" });
  }
  if (durationMs > MAX_WINDOW_MS) {
    throw new InvalidRequestError({ code: "RESERVATION_WINDOW_TOO_LARGE" });
  }

  return { from, to };
}

export function validateReservationTime(options: {
  startsAt: Date;
  endsAt: Date;
  settings: ReservationSettings;
  now?: Date;
  allowPastStart?: boolean;
}): void {
  const issue = getReservationTimeValidationIssue(options);
  if (issue) {
    throw new InvalidEntityError(issue);
  }
}
