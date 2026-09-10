import { describe, expect, it } from "bun:test";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { getTestInstance } from "better-auth/test";
import { Effect, Logger } from "effect";
import { betterAuthLogger } from "./better-auth.js";

describe("Better Auth logging", () => {
  it("omits OAuth callback input and database exception details", async () => {
    const { auth } = await getTestInstance(
      { logger: betterAuthLogger },
      { disableTestUser: true },
    );

    const entries: Array<{ level: string; message: unknown }> = [];

    const logger = Logger.make(({ logLevel, message }) => {
      entries.push({ level: logLevel, message });
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        yield* installScopedLogRunner;
        yield* Effect.promise(async () => {
          const response = await auth.handler(
            new Request(
              "http://localhost:3000/api/auth/callback/discord?error=private-oauth-token",
            ),
          );

          expect(response.status).toBe(302);
          expect(response.headers.get("location")).toContain("state_not_found");
          const context = await auth.$context;
          context.logger.error("Database operation failed", {
            query: "INSERT INTO account VALUES ($1)",
            params: ["private-refresh-token"],
            cause: new Error("private-access-token"),
          });
          betterAuthLogger.log("error", new Error("private-error-message"));
          betterAuthLogger.log("warn", "");
        });
        yield* Effect.yieldNow;
      }).pipe(Effect.scoped, Effect.provide(Logger.layer([logger]))),
    );
    expect(entries).toEqual([
      {
        level: "Error",
        message: ["State not found", { context: "BetterAuth" }],
      },
      {
        level: "Error",
        message: ["Database operation failed", { context: "BetterAuth" }],
      },
      {
        level: "Error",
        message: ["Authentication event", { context: "BetterAuth" }],
      },
      {
        level: "Warn",
        message: ["Authentication event", { context: "BetterAuth" }],
      },
    ]);
    expect(JSON.stringify(entries)).not.toContain("private-");
  });
});
