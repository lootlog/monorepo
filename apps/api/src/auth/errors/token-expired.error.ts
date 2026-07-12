export class TokenExpiredError extends Error {
  constructor(
    public readonly code:
      | "TOKEN_NOT_FOUND"
      | "TOKEN_EXPIRED"
      | "TOKEN_REFRESH_FAILED" = "TOKEN_EXPIRED",
  ) {
    super(code);
    this.name = "TokenExpiredError";
  }
}
