export class InvalidScopesError extends Error {
  constructor(
    public readonly required: string[],
    public readonly actual: string[],
  ) {
    super(`Missing required scopes: ${required.join(", ")}`);
    this.name = "InvalidScopesError";
  }
}
