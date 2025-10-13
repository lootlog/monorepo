export class TokenExpiredError extends Error {
  constructor() {
    super('IDP token has expired');
    this.name = 'TokenExpiredError';
  }
}
