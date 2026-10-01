import { Schema } from "effect";

/**
 * Margonem game edition that produced an observation. Values are the game's
 * own edition identifiers (`CFG.LANG`, `__build.lang`): `pl` is served from
 * `*.margonem.pl`, `en` from `*.margonem.com`.
 *
 * The edition namespaces catalog identities and their presentation; it does
 * not prove the language of every text in a payload. `world` scopes gameplay
 * and stays independent of it.
 *
 * A game version is declared by the client. The API validates the value but
 * cannot verify which host the client ran on.
 */
export const GameVersion = {
  EN: "en",
  PL: "pl",
} as const;

export type GameVersion = (typeof GameVersion)[keyof typeof GameVersion];

export const GameVersionSchema = Schema.Literals([
  GameVersion.EN,
  GameVersion.PL,
]);
