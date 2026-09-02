import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";

/** Launches a scoped application layer with Bun's SIGINT/SIGTERM integration. */
export const runApiRuntime = <E>(application: Layer.Layer<never, E>): void => {
  BunRuntime.runMain(Layer.launch(application));
};
