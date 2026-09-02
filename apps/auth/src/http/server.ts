import { Context, Effect, FiberSet, Layer } from "effect";
import { AuthService } from "#src/auth/auth-service";
import { BetterAuthRuntime } from "#src/auth/better-auth";
import { AppConfig } from "#src/config/env";
import { handleAuthRequest } from "./application.js";

export class AuthHttpServer extends Context.Service<
  AuthHttpServer,
  Bun.Server<undefined>
>()("@lootlog/auth/AuthHttpServer") {
  static readonly layer = Layer.effect(
    AuthHttpServer,
    Effect.gen(function* () {
      const config = yield* AppConfig;
      yield* AuthService;
      yield* BetterAuthRuntime;
      const runRequest = yield* FiberSet.makeRuntimePromise<
        AuthService | BetterAuthRuntime,
        Response,
        never
      >();
      const requestHandler = (request: Request) =>
        runRequest(handleAuthRequest(request));

      const server = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Bun.serve({
            hostname: "0.0.0.0",
            port: config.port,
            fetch: requestHandler,
          }),
        ),
        (runningServer) =>
          Effect.promise(async () => {
            await runningServer.stop(true);
          }),
      );

      yield* Effect.logInfo("Auth HTTP server listening").pipe(
        Effect.annotateLogs({
          host: server.hostname,
          port: server.port,
          service: config.serviceName,
        }),
      );

      return AuthHttpServer.of(server);
    }),
  );
}
