export class DiscordTokenRejectedError extends Error {
  constructor() {
    super("Discord rejected the IDP token");
    this.name = "DiscordTokenRejectedError";
  }
}
