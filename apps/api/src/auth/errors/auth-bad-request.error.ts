export class AuthBadRequestError extends Error {
  constructor(message?: string) {
    super(message ?? "Bad request to auth service");
    this.name = "AuthBadRequestError";
  }
}
