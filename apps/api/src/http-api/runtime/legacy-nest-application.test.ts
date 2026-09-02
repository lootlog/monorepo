import { expect, test } from "bun:test";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Effect } from "effect";
import {
  LegacyNestApplication,
  makeLegacyNestApplicationLayer,
} from "./legacy-nest-application.js";

const application = (calls: string[]) =>
  ({
    init: () => {
      calls.push("init");
      return Promise.resolve();
    },
    startAllMicroservices: () => {
      calls.push("microservices");
      return Promise.resolve();
    },
    close: () => {
      calls.push("close");
      return Promise.resolve();
    },
  }) as unknown as NestFastifyApplication;

test("initializes without listening and closes at the Effect scope boundary", async () => {
  const calls: string[] = [];
  const layer = makeLegacyNestApplicationLayer(() =>
    Promise.resolve(application(calls)),
  );

  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const { app } = yield* LegacyNestApplication;
        expect(app).toBeDefined();
        calls.push("use");
      }).pipe(Effect.provide(layer)),
    ),
  );

  expect(calls).toEqual(["init", "microservices", "use", "close"]);
});

test("closes a partially initialized application when startup fails", async () => {
  const calls: string[] = [];
  const app = application(calls);
  app.startAllMicroservices = () => {
    calls.push("microservices");
    return Promise.reject(new Error("RabbitMQ unavailable"));
  };

  const exit = await Effect.runPromiseExit(
    Effect.scoped(
      Effect.void.pipe(
        Effect.provide(
          makeLegacyNestApplicationLayer(() => Promise.resolve(app)),
        ),
      ),
    ),
  );

  expect(exit._tag).toBe("Failure");
  expect(calls).toEqual(["init", "microservices", "close"]);
});
