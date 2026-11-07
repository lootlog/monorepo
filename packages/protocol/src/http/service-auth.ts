import { timingSafeEqual } from "node:crypto";
import { Redacted } from "effect";

/** Whether a supplied credential equals the service secret, in constant time. */
export const matchesServiceSecret = (
  supplied: string | undefined,
  secret: Redacted.Redacted<string> | undefined,
): boolean => {
  if (!secret || !Redacted.value(secret) || !supplied) return false;
  const expected = Buffer.from(Redacted.value(secret));
  const given = Buffer.from(supplied);

  return given.length === expected.length && timingSafeEqual(given, expected);
};

/** Internal service credentials are separate from end-user authentication. */
export const hasServiceAuthorization = (
  authorization: string | undefined,
  secret: Redacted.Redacted<string> | undefined,
): boolean =>
  authorization?.startsWith("Bearer ") === true &&
  matchesServiceSecret(authorization.slice("Bearer ".length), secret);
