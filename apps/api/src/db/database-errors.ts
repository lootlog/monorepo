type ErrorWithCode = Error & { code?: unknown; cause?: unknown };

export class DatabaseRecordNotFoundError extends Error {}

function hasErrorCode(error: unknown, codes: ReadonlySet<string>): boolean {
  let current = error;
  const visited = new Set<unknown>();
  while (current instanceof Error && !visited.has(current)) {
    visited.add(current);
    const codedError = current as ErrorWithCode;
    if (typeof codedError.code === "string" && codes.has(codedError.code)) {
      return true;
    }
    current = codedError.cause;
  }
  return false;
}

export const isUniqueConstraintError = (error: unknown) =>
  hasErrorCode(error, new Set(["23505", "CONSTRAINT.UNIQUE"]));

export const isRecordNotFoundError = (error: unknown) =>
  error instanceof DatabaseRecordNotFoundError ||
  hasErrorCode(error, new Set(["RECORD.NOT_FOUND"]));
