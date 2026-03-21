export class AuthServiceUnavailableError extends Error {
  constructor(message?: string) {
    super(message ?? "Auth service is temporarily unavailable");
    this.name = "AuthServiceUnavailableError";
  }
}
