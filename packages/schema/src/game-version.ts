import { Schema } from "effect";

export const GameVersion = {
  EN: "en",
  PL: "pl",
} as const;

export type GameVersion = (typeof GameVersion)[keyof typeof GameVersion];

export const GameVersionSchema = Schema.Literals([
  GameVersion.EN,
  GameVersion.PL,
]);
