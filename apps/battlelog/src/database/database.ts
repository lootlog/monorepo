import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Effect } from "effect";
import { relations } from "./relations.js";

/** The Effect-native Drizzle service. Queries retain interruption and tracing. */
export const makeDrizzleDatabase = makeWithDefaults({ relations });

export type DrizzleDatabase = Effect.Success<typeof makeDrizzleDatabase>;
