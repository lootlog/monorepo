import { Schema } from "effect";

export enum RuntimeEnvironment {
  LOCAL = "local",
  DEV = "dev",
  STAGING = "staging",
  PROD = "prod",
}

export const RuntimeEnvironmentSchema = Schema.Literals([
  RuntimeEnvironment.LOCAL,
  RuntimeEnvironment.DEV,
  RuntimeEnvironment.STAGING,
  RuntimeEnvironment.PROD,
]);
