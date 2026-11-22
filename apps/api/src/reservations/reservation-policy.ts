import {
  InvalidRequestError,
  InvalidEntityError,
} from "@lootlog/protocol/http/errors";
import {
  validateReservationTime as getReservationTimeValidationIssue,
  type ReservationSettings,
} from "@lootlog/domain/reservations";
import { Effect } from "effect";

const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

export function parseReservationWindow(
  fromValue: string,
  toValue: string,
): Effect.Effect<{ from: Date; to: Date }, InvalidRequestError> {
  const from = new Date(fromValue);
  const to = new Date(toValue);
  const durationMs = to.getTime() - from.getTime();

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    durationMs <= 0
  ) {
    return Effect.fail(new InvalidRequestError({ code: "INVALID_TIME_RANGE" }));
  }

  if (durationMs > MAX_WINDOW_MS) {
    return Effect.fail(
      new InvalidRequestError({ code: "RESERVATION_WINDOW_TOO_LARGE" }),
    );
  }

  return Effect.succeed({ from, to });
}

export function validateReservationTime(options: {
  startsAt: Date;
  endsAt: Date;
  settings: ReservationSettings;
  now?: Date;
  allowPastStart?: boolean;
}): Effect.Effect<void, InvalidEntityError> {
  const issue = getReservationTimeValidationIssue(options);

  if (!issue) return Effect.void;

  const { code, ...details } = issue;

  return Effect.fail(new InvalidEntityError({ code, details }));
}
