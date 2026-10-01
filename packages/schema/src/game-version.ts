import { Schema } from "effect";

/**
 * Margonem game edition that produced an observation. Values are the game's
 * own edition identifiers (`CFG.LANG`, `__build.lang`): `pl` is served from
 * `*.margonem.pl`, `en` from `*.margonem.com`.
 *
 * The edition namespaces catalog identities and their presentation; it does
 * not prove the language of every text in a payload. `world` scopes gameplay;
 * every world belongs to exactly one edition (`gameVersionOfWorld`).
 *
 * A game version is declared by the client. The API validates the value but
 * cannot verify which host the client ran on; when a client declares none, the
 * API derives it from the world.
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

/**
 * Worlds served from `*.margonem.com`. Every other world belongs to the Polish
 * edition, so a new English world needs an entry here.
 */
export const EN_EDITION_WORLDS: ReadonlySet<string> = new Set([
  "cronus",
  "husaria",
  "steamrealm",
]);

/** Edition of a world, for observations whose client declared none. */
export const gameVersionOfWorld = (world: string): GameVersion =>
  EN_EDITION_WORLDS.has(world.toLowerCase()) ? GameVersion.EN : GameVersion.PL;
