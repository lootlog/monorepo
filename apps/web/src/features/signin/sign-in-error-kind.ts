export type SignInErrorKind =
  | "emailMissing"
  | "cancelled"
  | "expired"
  | "accountConflict"
  | "otherDiscordAccount"
  | "banned"
  | "discordUnavailable"
  | "unknown";

const SIGN_IN_ERROR_KINDS = new Map<string, SignInErrorKind>([
  ["email_not_found", "emailMissing"],
  ["access_denied", "cancelled"],
  ["state_mismatch", "expired"],
  ["state_invalid", "expired"],
  ["state_not_found", "expired"],
  ["invalid_code", "expired"],
  ["no_code", "expired"],
  ["account_not_linked", "accountConflict"],
  ["email_not_verified", "accountConflict"],
  ["account_already_linked_to_different_user", "otherDiscordAccount"],
  ["BANNED_USER", "banned"],
  ["unable_to_get_user_info", "discordUnavailable"],
  ["server_error", "discordUnavailable"],
  ["temporarily_unavailable", "discordUnavailable"],
]);

export const signInErrorKind = (code: string | undefined): SignInErrorKind =>
  SIGN_IN_ERROR_KINDS.get(code ?? "") ?? "unknown";
