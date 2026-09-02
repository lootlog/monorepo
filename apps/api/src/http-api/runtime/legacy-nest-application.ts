import type { INestApplicationContext } from "@nestjs/common";
import { Context, Effect, Layer, Schema } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class LegacyNestApplicationError extends Schema.TaggedError<LegacyNestApplicationError>()(
  "LegacyNestApplicationError",
  { phase: Schema.Literals(["start", "stop"]), cause: Schema.Defect() },
) {}

export interface LegacyNestApplicationValue {
  readonly app: INestApplicationContext;
}

export class LegacyNestApplication extends Context.Service<
  LegacyNestApplication,
  LegacyNestApplicationValue
>()("@lootlog/api/http-api/LegacyNestApplication") {}

export type LegacyNestApplicationFactory =
  () => Promise<INestApplicationContext>;

const createDefaultApplication: LegacyNestApplicationFactory = async () => {
  const { createApp } = await import("#src/app.factory");
  return createApp();
};

const startApplication = (factory: LegacyNestApplicationFactory) =>
  Effect.tryPromise({
    try: async () => {
      const app = await factory();
      try {
        await app.init();
        return LegacyNestApplication.of({ app });
      } catch (error) {
        await app.close().catch(() => undefined);
        throw error;
      }
    },
    catch: (cause) => new LegacyNestApplicationError({ phase: "start", cause }),
  });

const stopApplication = ({ app }: LegacyNestApplicationValue) =>
  Effect.tryPromise({
    try: () => app.close(),
    catch: (cause) => new LegacyNestApplicationError({ phase: "stop", cause }),
  }).pipe(
    Effect.catch((error) =>
      Effect.logError("Failed to stop legacy Nest application").pipe(
        Effect.annotateLogs({ service: "api", cause: error.cause }),
      ),
    ),
  );

/**
 * Transitional, non-listening Nest boundary. It keeps the established DI,
 * queue consumers and schedulers alive while Bun owns the only public HTTP
 * listener. The scope guarantees cleanup on SIGINT/SIGTERM.
 */
export const makeLegacyNestApplicationLayer = (
  factory: LegacyNestApplicationFactory = createDefaultApplication,
) =>
  Layer.effect(
    LegacyNestApplication,
    Effect.acquireRelease(startApplication(factory), stopApplication),
  );

export const LegacyNestApplicationLive = makeLegacyNestApplicationLayer();
