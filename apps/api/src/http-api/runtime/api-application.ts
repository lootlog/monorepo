import { Layer } from "effect";
import { ApiHttpServerLive } from "./http-routes.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";
import { LegacyNestApplicationLive } from "./legacy-nest-application.js";
import { ApiLifecycleLive } from "./lifecycle.js";

const ApiRuntimeDependencies = Layer.merge(
  ApiRuntimeConfig.layer,
  LegacyNestApplicationLive,
);

/** Complete scoped API process: Bun HTTP plus transitional application data. */
export const ApiApplicationLive = Layer.merge(
  ApiLifecycleLive,
  ApiHttpServerLive,
).pipe(Layer.provide(ApiRuntimeDependencies));
