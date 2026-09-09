import { timingSafeEqual } from "node:crypto";
import { Redacted } from "effect";

/** Internal service credentials are separate from end-user authentication. */
export const hasServiceAuthorization = (
  authorization: string | undefined,
  secret: Redacted.Redacted<string> | undefined,
): boolean => {
  if (!secret || !Redacted.value(secret) || !authorization) return false;
  const expected = Buffer.from(`Bearer ${Redacted.value(secret)}`);
  const supplied = Buffer.from(authorization);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
};
