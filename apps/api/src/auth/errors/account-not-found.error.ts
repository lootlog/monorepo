export class AccountNotFoundError extends Error {
  constructor() {
    super('User account not found');
    this.name = 'AccountNotFoundError';
  }
}
