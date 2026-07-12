export const AUTH_REAUTHENTICATION_ERROR_CODES = [
  "SESSION_NOT_FOUND",
  "ACCOUNT_NOT_FOUND",
  "TOKEN_NOT_FOUND",
  "TOKEN_EXPIRED",
  "TOKEN_REFRESH_FAILED",
] as const;

export type AuthReauthenticationErrorCode =
  (typeof AUTH_REAUTHENTICATION_ERROR_CODES)[number];

export type AuthErrorCode = AuthReauthenticationErrorCode | "INTERNAL_ERROR";

export type AuthErrorResponse = {
  error: AuthErrorCode;
  requiresReauth: boolean;
};

export const isAuthErrorResponse = (
  value: unknown,
): value is AuthErrorResponse => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.error === "string" &&
    typeof candidate.requiresReauth === "boolean"
  );
};
