import { expect, it } from "bun:test";
import { Effect, Exit } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import {
  DependencyUnavailableError,
  InvalidRequestError,
  RateLimitedError,
  UnexpectedApplicationError,
} from "#src/shared/http/http-errors";
import { applicationErrorResponse } from "./application-error-response.js";

it.each([
  {
    error: new InvalidRequestError("MISSING_MESSAGE_OR_NPC"),
    status: 400,
    body: { message: "MISSING_MESSAGE_OR_NPC" },
  },
  {
    error: new RateLimitedError({
      message: "NOTIFICATION_RATE_LIMITED",
      retryAfterMs: 2000,
    }),
    status: 429,
    body: { message: "NOTIFICATION_RATE_LIMITED", retryAfterMs: 2000 },
  },
  {
    error: new DependencyUnavailableError({
      message: "private connection details",
    }),
    status: 503,
    body: { statusCode: 503, message: "Service unavailable" },
  },
])(
  "preserves status $status and safe error details",
  async ({ error, status, body }) => {
    const response = HttpServerResponse.toWeb(
      await Effect.runPromise(applicationErrorResponse(error)),
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
  },
);

it.each([
  new Error("private database detail"),
  new UnexpectedApplicationError("private database detail"),
])("keeps unknown/internal errors in the defect channel", async (error) => {
  expect(
    Exit.isFailure(
      await Effect.runPromiseExit(applicationErrorResponse(error)),
    ),
  ).toBe(true);
});
