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

const BEARER_CREDENTIALS = /^Bearer\s+(\S.*)$/iu;

/** The token of an `Authorization: Bearer` header; the scheme name is case-insensitive. */
export const readBearerToken = (
  authorization: string | undefined,
): string | undefined => authorization?.match(BEARER_CREDENTIALS)?.[1];

/** Internal service credentials are separate from end-user authentication. */
export const hasServiceAuthorization = (
  authorization: string | undefined,
  secret: Redacted.Redacted<string> | undefined,
): boolean => matchesServiceSecret(readBearerToken(authorization), secret);
