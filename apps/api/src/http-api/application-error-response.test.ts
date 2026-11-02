import { expect, it } from "bun:test";
import { Effect, Exit } from "effect";
import { HttpServerResponse } from "effect/http";
import {
  DependencyUnavailableError,
  InvalidRequestError,
  RateLimitedError,
  UnexpectedApplicationError,
} from "#src/shared/http/http-errors";
import { applicationErrorResponse } from "./application-error-response.js";

it.each([
  {
    error: new InvalidRequestError({ code: "MISSING_MESSAGE_OR_NPC" }),
    status: 400,
    body: { code: "MISSING_MESSAGE_OR_NPC" },
    retryAfter: null,
  },
  {
    error: new RateLimitedError({
      code: "NOTIFICATION_RATE_LIMITED",
      retryAfterMs: 1500,
    }),
    status: 429,
    body: { code: "NOTIFICATION_RATE_LIMITED" },
    retryAfter: "2",
  },
  {
    error: new DependencyUnavailableError({
      message: "private connection details",
    }),
    status: 503,
    body: { code: "SERVICE_UNAVAILABLE", message: "Service unavailable" },
    retryAfter: null,
  },
])(
  "preserves status $status and safe error details",
  async ({ error, status, body, retryAfter }) => {
    const response = HttpServerResponse.toWeb(
      await Effect.runPromise(applicationErrorResponse(error)),
    );

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
    expect(response.headers.get("retry-after")).toBe(retryAfter);
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
