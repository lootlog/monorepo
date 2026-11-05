import { MAIN_ACCOUNT_OPERATIONS } from "./public-api-operations/main-accounts.js";
import { MAIN_TIMER_OPERATIONS } from "./public-api-operations/main-timers.js";
import { MAIN_LOOT_OPERATIONS } from "./public-api-operations/main-loot.js";
import { MAIN_RESERVATION_OPERATIONS } from "./public-api-operations/main-reservations.js";
import { MAIN_NOTIFICATION_OPERATIONS } from "./public-api-operations/main-notifications.js";
import { MAIN_EVENT_OPERATIONS } from "./public-api-operations/main-events.js";
import { MAIN_KILL_OPERATIONS } from "./public-api-operations/main-kills.js";
import { MAIN_THEME_OPERATIONS } from "./public-api-operations/main-themes.js";
import { MAIN_DOC_OPERATIONS } from "./public-api-operations/main-docs.js";
import { ACTIVITY_OPERATIONS } from "./public-api-operations/activity.js";
import { BATTLELOG_OPERATIONS } from "./public-api-operations/battlelog.js";
import { SEARCH_OPERATIONS } from "./public-api-operations/search.js";

/** Explicit supported HTTP inventory. Unknown operations are session-only. */
export type PublicApiService = "main" | "activity" | "battlelog" | "search";

export type PublicApiOperation = {
  readonly service: PublicApiService;
  readonly method: string;
  readonly path: string;
  readonly operationId: string;
  readonly access: "read" | "write" | "session-only";
  readonly data: "organization" | "personal" | "mixed" | "public";
  /** Parameters the Web app uses but the published SDK does not expose. */
  readonly sessionOnlyParameters?: ReadonlyArray<string>;
};

export const PUBLIC_API_OPERATIONS = [
  ...MAIN_ACCOUNT_OPERATIONS,
  ...MAIN_TIMER_OPERATIONS,
  ...MAIN_LOOT_OPERATIONS,
  ...MAIN_RESERVATION_OPERATIONS,
  ...MAIN_NOTIFICATION_OPERATIONS,
  ...MAIN_EVENT_OPERATIONS,
  ...MAIN_KILL_OPERATIONS,
  ...MAIN_THEME_OPERATIONS,
  ...MAIN_DOC_OPERATIONS,
  ...ACTIVITY_OPERATIONS,
  ...BATTLELOG_OPERATIONS,
  ...SEARCH_OPERATIONS,
] as const satisfies readonly PublicApiOperation[];

export function getPublicApiOperation(
  service: string,
  operationId: string,
): PublicApiOperation | undefined {
  return PUBLIC_API_OPERATIONS.find(
    (operation) =>
      operation.service === service && operation.operationId === operationId,
  );
}
